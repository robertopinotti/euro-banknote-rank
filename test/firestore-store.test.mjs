/**
 * Test dell'adattatore Firestore contro l'emulatore.
 *
 * I test delle regole (firestore-rules.test.mjs) usano l'SDK Firebase, mentre
 * il sito parla REST con `updateMask` e `updateTransforms`: è una forma di
 * scrittura diversa, che le regole potrebbero benissimo rifiutare. Qui gira il
 * codice vero di `src/store.js`, così si verifica l'incastro fra i due — che è
 * il punto in cui un errore passerebbe inosservato fino alla produzione.
 *
 * Richiede l'emulatore in ascolto (FIRESTORE_EMULATOR_HOST). Vedi README.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { FirestoreStore } from '../src/store.js';

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT = 'banconota-store-test';

const store = new FirestoreStore({
  projectId: PROJECT,
  apiKey: 'chiave-finta-emulatore',
  host: HOST,
});

/** L'emulatore espone un endpoint per svuotare il database fra un test e l'altro. */
async function clear() {
  const res = await fetch(
    `http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  assert.ok(res.ok, `pulizia del database fallita: HTTP ${res.status}`);
}

function find(stats, denomination, lo, hi) {
  return stats.find(
    (s) => s.denomination === denomination && s.designLo === lo && s.designHi === hi
  );
}

test.beforeEach(clear);

test('una collezione vuota non è un errore', async () => {
  assert.deepEqual(await store.loadPairStats(), []);
});

test('il primo voto crea la coppia con entrambi i contatori', async () => {
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

test("l'ordine di presentazione non crea documenti doppi", async () => {
  await store.submitVote({ denomination: 50, winner: 'c', loser: 'a' });
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 1, 'la coppia a-c deve avere un documento solo');
  assert.deepEqual(find(stats, 50, 'a', 'c'), {
    denomination: 50,
    designLo: 'a',
    designHi: 'c',
    winsLo: 2,
    winsHi: 1,
  });
});

test('i voti si sommano senza sovrascriversi', async () => {
  for (let i = 0; i < 25; i++) {
    await store.submitVote({ denomination: 5, winner: 'b', loser: 'j' });
  }
  const row = find(await store.loadPairStats(), 5, 'b', 'j');
  assert.equal(row.winsLo, 25);
  assert.equal(row.winsHi, 0);
});

test('voti simultanei sulla stessa coppia non si perdono', async () => {
  // L'incremento avviene lato server, quindi non c'è la finestra fra lettura e
  // scrittura in cui due votanti si sovrascriverebbero a vicenda.
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

test('tagli e coppie diverse restano separati', async () => {
  await store.submitVote({ denomination: 5, winner: 'a', loser: 'b' });
  await store.submitVote({ denomination: 200, winner: 'a', loser: 'b' });
  await store.submitVote({ denomination: 5, winner: 'a', loser: 'c' });

  const stats = await store.loadPairStats();
  assert.equal(stats.length, 3);
  assert.equal(find(stats, 5, 'a', 'b').winsLo, 1);
  assert.equal(find(stats, 200, 'a', 'b').winsLo, 1);
  assert.equal(find(stats, 5, 'a', 'c').winsLo, 1);
});

test('le regole respingono una scrittura che non sia un +1', async () => {
  await store.submitVote({ denomination: 50, winner: 'a', loser: 'c' });

  // Stessa rotta REST usata dal sito, ma con un incremento gonfiato: è il modo
  // in cui qualcuno proverebbe a truccare la classifica.
  const res = await fetch(
    `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents:commit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${PROJECT}/databases/(default)/documents/pairStats/50_a_c`,
              fields: {
                denomination: { integerValue: '50' },
                designLo: { stringValue: 'a' },
                designHi: { stringValue: 'c' },
              },
            },
            updateMask: { fieldPaths: ['denomination', 'designLo', 'designHi'] },
            updateTransforms: [
              { fieldPath: 'winsLo', increment: { integerValue: '999999' } },
            ],
          },
        ],
      }),
    }
  );

  assert.equal(res.status, 403, 'l\'incremento gonfiato deve essere respinto');

  const row = find(await store.loadPairStats(), 50, 'a', 'c');
  assert.equal(row.winsLo, 1, 'il punteggio non deve essere cambiato');
});

test('le regole respingono una coppia inesistente', async () => {
  await assert.rejects(
    () => store.submitVote({ denomination: 500, winner: 'a', loser: 'b' }),
    /Voto rifiutato/
  );
  assert.deepEqual(await store.loadPairStats(), []);
});
