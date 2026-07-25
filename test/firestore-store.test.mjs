/**
 * The Firestore adapter, exercised against the emulator.
 *
 * The rules tests (firestore-rules.test.mjs) drive the Firebase SDK, while the
 * site speaks REST with `updateMask` and `updateTransforms` — a different shape
 * of write, which the rules could perfectly well refuse. What runs here is the
 * real code from `src/store.js`, so the join between the two is checked: that
 * is exactly where a mistake would go unnoticed until production.
 *
 * Needs the emulator listening (FIRESTORE_EMULATOR_HOST). See the README.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { FirestoreStore } from '../src/store.js';

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT = 'banconota-store-test';
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;

const store = new FirestoreStore({
  projectId: PROJECT,
  apiKey: 'chiave-finta-emulatore',
  host: HOST,
});

const DENOMINATIONS = [5, 10, 20, 50, 100, 200];
const DESIGNS = 'abcdefghij'.split('');

/** The 540 counter names, in the same order the seeding script produces. */
function allCounterNames() {
  const names = [];
  for (const d of DENOMINATIONS) {
    for (let i = 0; i < DESIGNS.length; i++) {
      for (let j = i + 1; j < DESIGNS.length; j++) {
        names.push(FirestoreStore.counterName(d, DESIGNS[i], DESIGNS[j], 'lo'));
        names.push(FirestoreStore.counterName(d, DESIGNS[i], DESIGNS[j], 'hi'));
      }
    }
  }
  return names;
}

/** The emulator exposes an endpoint that empties the database between tests. */
async function clear() {
  const res = await fetch(`http://${HOST}/emulator/v1/${ROOT}`, { method: 'DELETE' });
  assert.ok(res.ok, `pulizia del database fallita: HTTP ${res.status}`);
}

/**
 * Creates stats/all with all 540 counters at zero.
 *
 * The rules forbid creating it — it is seeded once, by hand, in production —
 * so this goes in as the emulator owner, which bypasses them. Doing it in
 * every test is also what makes the "cannot create from the browser" case in
 * the rules tests meaningful: here we prove the site works given a seeded
 * document, there that the site cannot seed it itself.
 */
async function seed(values = {}) {
  const fields = {};
  for (const name of allCounterNames()) {
    fields[name] = { integerValue: String(values[name] ?? 0) };
  }
  const res = await fetch(`http://${HOST}/v1/${ROOT}/stats?documentId=all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({
      fields: { last: { stringValue: '' }, c: { mapValue: { fields } } },
    }),
  });
  assert.ok(res.ok, `semina fallita: HTTP ${res.status} ${await res.text()}`);
}

function find(stats, denomination, lo, hi) {
  return stats.find(
    (s) => s.denomination === denomination && s.designLo === lo && s.designHi === hi
  );
}

test.beforeEach(async () => {
  await clear();
  await seed();
});

test('a document that is not there yet is not an error', async () => {
  await clear();
  assert.deepEqual(await store.loadPairStats(), []);
});

test('before the migration it still reads the old collection', async () => {
  // Percorso di transizione: il codice puo' essere pubblicato prima che
  // stats/all esista senza che la classifica vada a zero per tutti.
  await clear();
  const res = await fetch(`http://${HOST}/v1/${ROOT}/pairStats?documentId=50_a_c`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      denomination: { integerValue: '50' },
      designLo: { stringValue: 'a' }, designHi: { stringValue: 'c' },
      winsLo: { integerValue: '11' }, winsHi: { integerValue: '4' },
    } }),
  });
  assert.ok(res.ok);

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 1);
  assert.equal(stats[0].winsLo, 11);
  assert.equal(stats[0].winsHi, 4);
});

test('once seeded, the old collection is ignored', async () => {
  // Se leggesse entrambe le fonti i voti verrebbero contati due volte.
  const res = await fetch(`http://${HOST}/v1/${ROOT}/pairStats?documentId=50_a_c`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      denomination: { integerValue: '50' },
      designLo: { stringValue: 'a' }, designHi: { stringValue: 'c' },
      winsLo: { integerValue: '999' }, winsHi: { integerValue: '999' },
    } }),
  });
  assert.ok(res.ok);

  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });
  const row = find(await store.loadPairStats(), 50, 'a', 'c');
  assert.equal(row.winsLo, 1, 'deve contare solo il documento aggregato');
  assert.equal(row.winsHi, 0);
});

test('a seeded but unvoted ranking reads as empty', async () => {
  // I 540 contatori esistono tutti, ma nessuno è stato votato: le coppie a zero
  // non portano informazione e non devono comparire.
  assert.deepEqual(await store.loadPairStats(), []);
});

test('the first vote lands on the right side of the pair', async () => {
  await store.submitVote({ denomination: 50, winner: 'c', loser: 'a' });

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 1);
  // 'c' ha vinto ma in ordine alfabetico sta dopo 'a': deve finire in winsHi.
  assert.deepEqual(stats[0], {
    denomination: 50,
    designLo: 'a',
    designHi: 'c',
    winsLo: 0,
    winsHi: 1,
  });
});

test('the order the pair was shown in does not split the counts', async () => {
  await store.submitVote({ denomination: 50, winner: 'c', loser: 'a' });
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 1, 'la coppia a-c deve restare una riga sola');
  assert.deepEqual(find(stats, 50, 'a', 'c'), {
    denomination: 50,
    designLo: 'a',
    designHi: 'c',
    winsLo: 2,
    winsHi: 1,
  });
});

test('votes add up instead of overwriting each other', async () => {
  for (let i = 0; i < 25; i++) {
    await store.submitVote({ denomination: 5, winner: 'b', loser: 'j' });
  }
  const row = find(await store.loadPairStats(), 5, 'b', 'j');
  assert.equal(row.winsLo, 25);
  assert.equal(row.winsHi, 0);
});

test('simultaneous votes on the same pair are not lost', async () => {
  // L'incremento avviene lato server, quindi non c'è la finestra fra lettura e
  // scrittura in cui due votanti si sovrascriverebbero a vicenda. Ora che i
  // contatori stanno in un documento solo, questo caso vale anche di piu': la
  // contesa è su un unico documento invece che su 270.
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      store.submitVote(
        i % 2 === 0
          ? { denomination: 20, winner: 'd', loser: 'h' }
          : { denomination: 20, winner: 'h', loser: 'd' }
      )
    )
  );

  const row = find(await store.loadPairStats(), 20, 'd', 'h');
  assert.equal(row.winsLo + row.winsHi, 20, 'nessun voto deve andare perso');
  assert.equal(row.winsLo, 10);
  assert.equal(row.winsHi, 10);
});

test('simultaneous votes on different pairs do not collide either', async () => {
  // Tutte le scritture ora colpiscono lo stesso documento: se la contesa fosse
  // gestita male, dei voti su coppie diverse si perderebbero fra loro.
  await Promise.all([
    store.submitVote({ denomination: 5, winner: 'a', loser: 'b' }),
    store.submitVote({ denomination: 10, winner: 'c', loser: 'd' }),
    store.submitVote({ denomination: 20, winner: 'e', loser: 'f' }),
    store.submitVote({ denomination: 50, winner: 'g', loser: 'h' }),
    store.submitVote({ denomination: 100, winner: 'i', loser: 'j' }),
    store.submitVote({ denomination: 200, winner: 'a', loser: 'j' }),
  ]);

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 6, 'sei voti su sei coppie diverse, sei righe');
  assert.equal(find(stats, 5, 'a', 'b').winsLo, 1);
  assert.equal(find(stats, 10, 'c', 'd').winsLo, 1);
  assert.equal(find(stats, 200, 'a', 'j').winsLo, 1);
});

test('denominations and pairs stay separate', async () => {
  await store.submitVote({ denomination: 5, winner: 'a', loser: 'b' });
  await store.submitVote({ denomination: 200, winner: 'a', loser: 'b' });
  await store.submitVote({ denomination: 5, winner: 'a', loser: 'c' });

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 3);
  assert.equal(find(stats, 5, 'a', 'b').winsLo, 1);
  assert.equal(find(stats, 200, 'a', 'b').winsLo, 1);
  assert.equal(find(stats, 5, 'a', 'c').winsLo, 1);
});

test('reading the whole ranking costs exactly one request', async () => {
  // È il motivo per cui questo schema esiste: prima erano 270 letture, una per
  // coppia, e la quota gratuita finiva dopo meno di cento visite.
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });

  const vera = globalThis.fetch;
  let chiamate = 0;
  globalThis.fetch = (...args) => { chiamate++; return vera(...args); };
  try {
    await store.loadPairStats();
  } finally {
    globalThis.fetch = vera;
  }
  assert.equal(chiamate, 1);
});

test('the rules refuse a write that is not a +1', async () => {
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });

  // Stessa rotta REST usata dal sito, ma con un incremento gonfiato: è il modo
  // in cui qualcuno proverebbe a truccare la classifica.
  const res = await fetch(`http://${HOST}/v1/${ROOT}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: `${ROOT}/stats/all`,
            fields: { last: { stringValue: 'd50_a_c_lo' } },
          },
          updateMask: { fieldPaths: ['last'] },
          updateTransforms: [
            { fieldPath: 'c.d50_a_c_lo', increment: { integerValue: '999999' } },
          ],
        },
      ],
    }),
  });

  assert.equal(res.status, 403, "l'incremento gonfiato deve essere respinto");
  assert.equal(find(await store.loadPairStats(), 50, 'a', 'c').winsLo, 1);
});

test('the rules refuse a counter that declares one pair and inflates another', async () => {
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });

  const res = await fetch(`http://${HOST}/v1/${ROOT}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: `${ROOT}/stats/all`,
            fields: { last: { stringValue: 'd50_a_c_lo' } },
          },
          updateMask: { fieldPaths: ['last'] },
          updateTransforms: [
            { fieldPath: 'c.d50_a_c_lo', increment: { integerValue: '1' } },
            { fieldPath: 'c.d50_a_c_hi', increment: { integerValue: '1' } },
          ],
        },
      ],
    }),
  });

  assert.equal(res.status, 403);
  const row = find(await store.loadPairStats(), 50, 'a', 'c');
  assert.equal(row.winsLo, 1);
  assert.equal(row.winsHi, 0);
});

test('the rules refuse a pair that does not exist', async () => {
  await assert.rejects(
    () => store.submitVote({ denomination: 500, winner: 'a', loser: 'b' }),
    /Voto rifiutato/
  );
  assert.deepEqual(await store.loadPairStats(), []);
});

test('a 403 on the aggregate document falls back too, not just a 404', async () => {
  // Il bug che questo test blocca: in produzione, finche' sono pubblicate le
  // regole vecchie, il loro catch-all nega tutto fuori da pairStats. Il
  // documento non ancora creato risponde quindi 403 e non 404. Ripiegando solo
  // sul 404 la lettura sollevava, il sito passava in modalita' locale e la
  // classifica condivisa spariva.
  await clear();
  const res = await fetch(`http://${HOST}/v1/${ROOT}/pairStats?documentId=5_a_b`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      denomination: { integerValue: '5' },
      designLo: { stringValue: 'a' }, designHi: { stringValue: 'b' },
      winsLo: { integerValue: '6' }, winsHi: { integerValue: '2' },
    } }),
  });
  assert.ok(res.ok);

  // L'emulatore qui concede la lettura di stats/all, quindi il 403 va simulato.
  const vera = globalThis.fetch;
  globalThis.fetch = (url, ...rest) =>
    String(url).includes('/stats/all')
      ? Promise.resolve(new Response('{"error":{"code":403}}', { status: 403 }))
      : vera(url, ...rest);
  try {
    const stats = await store.loadPairStats();
    assert.equal(stats.length, 1, 'deve aver letto la vecchia collezione');
    assert.equal(stats[0].winsLo, 6);
  } finally {
    globalThis.fetch = vera;
  }
});
