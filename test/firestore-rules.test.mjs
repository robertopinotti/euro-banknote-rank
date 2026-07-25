/**
 * Firestore security rules, exercised against the emulator.
 *
 * On the free plan the rules are the only defence: the browser writes to
 * Firestore directly. What is checked here is that a vote can do nothing but
 * add 1 to one counter, and that every other write is refused.
 *
 * All 540 counters live in one document, stats/all, so the rules can no longer
 * name the field being written. Instead the write declares which counter it is
 * touching, in `last`, and the rules check that claim against the data with
 * dynamic indexing — c[last]. That mechanism is the load-bearing part of this
 * design, so the first thing these tests do is prove it actually works rather
 * than assume it.
 *
 * Needs the emulator listening (FIRESTORE_EMULATOR_HOST) and the dev
 * dependencies. See the README, Firebase section.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  deleteField,
} from 'firebase/firestore';

const RULES = new URL('../firebase/firestore.rules', import.meta.url);

let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'banconota-test',
    firestore: {
      rules: readFileSync(RULES, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

test.after(async () => {
  await env?.cleanup();
});

/** A few real counters, enough to exercise every rule. */
const A_LO = 'd50_a_c_lo';
const A_HI = 'd50_a_c_hi';
const B_LO = 'd5_b_j_lo';

/** The document as it exists in production: counters, all of them integers. */
function seedData(overrides = {}) {
  return {
    last: A_LO,
    c: { [A_LO]: 3, [A_HI]: 7, [B_LO]: 0, ...overrides },
  };
}

/** Seeds stats/all bypassing the rules, which forbid creating it. */
async function seed(data = seedData()) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'stats', 'all'), data);
  });
}

/** An anonymous client: exactly what a voter's browser is. */
function ref() {
  return doc(env.unauthenticatedContext().firestore(), 'stats', 'all');
}

/** The counters as they now stand, read with the rules out of the way. */
async function counters() {
  let out;
  await env.withSecurityRulesDisabled(async (ctx) => {
    out = (await getDoc(doc(ctx.firestore(), 'stats', 'all'))).data().c;
  });
  return out;
}

test.beforeEach(async () => {
  await seed();
});

/* ------------------------------------------------------------------- read */

test('anyone can read the ranking', async () => {
  const snap = await assertSucceeds(getDoc(ref()));
  assert.equal(snap.data().c[A_HI], 7);
});

/* ------------------------------------------------------ the legitimate vote */

test('a vote adds 1 to the counter it declares', async () => {
  await assertSucceeds(updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: increment(1) }));
  const c = await counters();
  assert.equal(c[A_LO], 4, 'il contatore dichiarato deve salire di 1');
  assert.equal(c[A_HI], 7, 'gli altri non si devono muovere');
});

test('both sides of a pair can be voted', async () => {
  await assertSucceeds(updateDoc(ref(), { last: A_HI, [`c.${A_HI}`]: increment(1) }));
  assert.equal((await counters())[A_HI], 8);
});

test('a counter still at zero can be voted', async () => {
  await assertSucceeds(updateDoc(ref(), { last: B_LO, [`c.${B_LO}`]: increment(1) }));
  assert.equal((await counters())[B_LO], 1);
});

/* -------------------------------------------- the claim has to be the truth */

test('declaring one counter and incrementing another is refused', async () => {
  // Senza il controllo sulle chiavi toccate, questa scrittura passerebbe: la
  // chiave dichiarata è valida e il suo valore è coerente con sé stesso.
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_HI}`]: increment(1) }));
  assert.equal((await counters())[A_HI], 7);
});

test('incrementing two counters in one write is refused', async () => {
  await assertFails(
    updateDoc(ref(), {
      last: A_LO,
      [`c.${A_LO}`]: increment(1),
      [`c.${A_HI}`]: increment(1),
    })
  );
  const c = await counters();
  assert.equal(c[A_LO], 3);
  assert.equal(c[A_HI], 7);
});

test('a vote plus a hidden inflation elsewhere is refused', async () => {
  await assertFails(
    updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: increment(1), [`c.${A_HI}`]: 9999 })
  );
  assert.equal((await counters())[A_HI], 7);
});

/* ------------------------------------------------------------ only ever +1 */

test('adding more than 1 is refused', async () => {
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: increment(2) }));
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: increment(1000) }));
  assert.equal((await counters())[A_LO], 3);
});

test('writing an arbitrary score is refused', async () => {
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: 500 }));
  assert.equal((await counters())[A_LO], 3);
});

test('taking votes away is refused', async () => {
  await assertFails(updateDoc(ref(), { last: A_HI, [`c.${A_HI}`]: increment(-1) }));
  await assertFails(updateDoc(ref(), { last: A_HI, [`c.${A_HI}`]: 0 }));
  assert.equal((await counters())[A_HI], 7);
});

test('a non-integer counter is refused', async () => {
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: 3.5 }));
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: 'quattro' }));
});

/* -------------------------------------------------- only real counter names */

test('an invented counter name is refused', async () => {
  for (const name of [
    'd50_a_c_boh',   // lato inesistente
    'd7_a_c_lo',     // taglio inesistente
    'd50_a_z_lo',    // design inesistente
    'd50_a_a_lo',    // un design contro sé stesso
    'd50_c_a_lo',    // coppia rovesciata: sarebbe letta come un risultato vero
    'totale',
  ]) {
    await assertFails(
      updateDoc(ref(), { last: name, [`c.${name}`]: increment(1) }),
      `avrebbe dovuto respingere ${name}`
    );
  }
});

test('an empty counter name never even reaches the rules', async () => {
  // Il nome vuoto darebbe il percorso "c.", che Firestore rifiuta come
  // malformato prima di inviarlo. Sta qui perché senza questa nota il caso
  // sembra scoperto dalle regole, e invece è coperto piu' a monte.
  // updateDoc solleva in modo sincrono, non restituisce una promessa
  // respinta: assert.rejects non lo intercetta.
  assert.throws(
    () => updateDoc(ref(), { last: '', ['c.']: increment(1) }),
    /Invalid field path/
  );
});

test('a counter that does not exist yet cannot be created', async () => {
  // Il documento nasce con tutti e 540 i contatori: se una scrittura potesse
  // aggiungerne uno, potrebbe anche nascere con un valore qualunque.
  await assertFails(
    updateDoc(ref(), { last: 'd100_i_j_lo', ['c.d100_i_j_lo']: increment(1) })
  );
});

test('a declaration that is not a string is refused', async () => {
  await assertFails(updateDoc(ref(), { last: 42, [`c.${A_LO}`]: increment(1) }));
  await assertFails(updateDoc(ref(), { last: ['d50_a_c_lo'], [`c.${A_LO}`]: increment(1) }));
});

test('omitting the declaration leaves the previous one standing, and that is safe', async () => {
  // Questo test aveva un'aspettativa sbagliata: pensavo che una scrittura
  // senza `last` dovesse essere respinta. Non lo è, e non può esserlo: se il
  // campo non viene scritto, le regole leggono quello che c'era già, e la
  // scrittura passa a patto di incrementare proprio quel contatore.
  //
  // Non è una falla, ed è il motivo per cui il test resta invece di sparire.
  // Chi omette la dichiarazione non guadagna niente: può solo fare +1 sul
  // contatore che l'ultimo votante ha dichiarato, cioè esattamente un voto
  // legittimo. Ogni altra chiave viene comunque respinta.
  assert.equal((await counters())[A_LO], 3, 'il seme dichiara A_LO');

  await assertSucceeds(updateDoc(ref(), { [`c.${A_LO}`]: increment(1) }));
  assert.equal((await counters())[A_LO], 4);

  // La garanzia che conta regge lo stesso: nessun altro contatore è toccabile.
  await assertFails(updateDoc(ref(), { [`c.${A_HI}`]: increment(1) }));
  await assertFails(updateDoc(ref(), { [`c.${A_LO}`]: increment(50) }));
  assert.equal((await counters())[A_HI], 7);
});

/* ---------------------------------------------------------- document shape */

test('invented fields are refused', async () => {
  await assertFails(
    updateDoc(ref(), { last: A_LO, [`c.${A_LO}`]: increment(1), admin: true })
  );
  await assertFails(updateDoc(ref(), { nota: 'ciao' }));
});

test('removing a counter is refused', async () => {
  await assertFails(updateDoc(ref(), { last: A_LO, [`c.${A_HI}`]: deleteField() }));
  assert.equal((await counters())[A_HI], 7);
});

test('replacing the whole counter map is refused', async () => {
  await assertFails(setDoc(ref(), { last: A_LO, c: { [A_LO]: 999 } }));
  assert.equal((await counters())[A_LO], 3);
});

/* --------------------------------------------------- creation and deletion */

test('the ranking document cannot be created from the browser', async () => {
  // È seminato una volta a mano. Se si potesse creare, si potrebbe anche
  // cancellare e ricreare con i numeri che si vogliono.
  await env.clearFirestore();
  await assertFails(setDoc(ref(), seedData()));
});

test('votes are never deleted', async () => {
  await assertFails(deleteDoc(ref()));
});

/* ------------------------------------------------------ everything else off */

test('the old per-pair collection is readable but frozen', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'pairStats', '50_a_c'), {
      denomination: 50, designLo: 'a', designHi: 'c', winsLo: 1, winsHi: 0,
    });
  });
  const old = doc(env.unauthenticatedContext().firestore(), 'pairStats', '50_a_c');
  await assertSucceeds(getDoc(old));
  await assertFails(updateDoc(old, { winsLo: increment(1) }));
  await assertFails(deleteDoc(old));
});

test('no access to collections that were never planned', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'utenti', 'io')));
  await assertFails(setDoc(doc(db, 'utenti', 'io'), { admin: true }));
  await assertFails(setDoc(doc(db, 'stats', 'altro'), { c: {} }));
});
