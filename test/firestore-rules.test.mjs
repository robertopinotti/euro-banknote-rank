/**
 * Test delle regole di sicurezza Firestore contro l'emulatore.
 *
 * Sul piano gratuito le regole sono l'unica difesa: il browser scrive
 * direttamente su Firestore. Quello che si verifica qui è che un voto possa
 * solo aggiungere 1 a un contatore, e che ogni altra scrittura venga respinta.
 *
 * Richiede l'emulatore in ascolto (FIRESTORE_EMULATOR_HOST) e le dipendenze
 * di sviluppo. Vedi README, sezione Firebase.
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
  collection,
  getDocs,
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

test.beforeEach(async () => {
  await env.clearFirestore();
});

/** Client anonimo, esattamente quello che è il browser di un votante. */
function db() {
  return env.unauthenticatedContext().firestore();
}

/** Semina una coppia scavalcando le regole, per preparare i test di update. */
async function seed(id, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'pairStats', id), data);
  });
}

const PAIR = { denomination: 50, designLo: 'a', designHi: 'c' };

/* ------------------------------------------------------------------ lettura */

test('chiunque può leggere la classifica', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertSucceeds(getDoc(doc(db(), 'pairStats', '50_a_c')));
  await assertSucceeds(getDocs(collection(db(), 'pairStats')));
});

/* ---------------------------------------------------------------- creazione */

test('il primo voto su una coppia crea il documento', async () => {
  await assertSucceeds(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: 1, winsHi: 0 })
  );
});

test('un documento non può nascere con più di un voto', async () => {
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: 999, winsHi: 0 })
  );
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: 1, winsHi: 1 })
  );
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: 0, winsHi: 0 })
  );
});

test("l'id del documento deve corrispondere ai campi", async () => {
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_b'), { ...PAIR, winsLo: 1, winsHi: 0 })
  );
  await assertFails(
    setDoc(doc(db(), 'pairStats', 'qualsiasi-cosa'), { ...PAIR, winsLo: 1, winsHi: 0 })
  );
});

test('tagli e design inesistenti vengono respinti', async () => {
  await assertFails(
    setDoc(doc(db(), 'pairStats', '500_a_c'), {
      ...PAIR, denomination: 500, winsLo: 1, winsHi: 0,
    })
  );
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_z'), {
      ...PAIR, designHi: 'z', winsLo: 1, winsHi: 0,
    })
  );
  // Lettere fuori ordine: aprirebbe la porta a due documenti per la stessa coppia.
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_c_a'), {
      denomination: 50, designLo: 'c', designHi: 'a', winsLo: 1, winsHi: 0,
    })
  );
  // Un design non può sfidare se stesso.
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_a'), {
      denomination: 50, designLo: 'a', designHi: 'a', winsLo: 1, winsHi: 0,
    })
  );
});

test('non si possono aggiungere campi di fantasia', async () => {
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), {
      ...PAIR, winsLo: 1, winsHi: 0, admin: true,
    })
  );
});

test('un documento non può nascere senza uno dei contatori', async () => {
  // Questi casi erano già respinti prima che le regole controllassero la forma
  // con hasAll: leggere un campo inesistente fa fallire la valutazione, quindi
  // la scrittura veniva negata comunque. Il test resta a presidiare il
  // comportamento, che prima dipendeva da un effetto collaterale del motore
  // delle regole e ora da un controllo esplicito.
  await assertFails(setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: 1 }));
  await assertFails(setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsHi: 1 }));
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { denomination: 50, winsLo: 1, winsHi: 0 })
  );
});

test('i contatori devono essere interi non negativi', async () => {
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: 1.5, winsHi: -0.5 })
  );
  await assertFails(
    setDoc(doc(db(), 'pairStats', '50_a_c'), { ...PAIR, winsLo: '1', winsHi: 0 })
  );
});

/* ---------------------------------------------------------------- incremento */

test('un voto aggiunge 1 a un contatore, da entrambi i lati', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertSucceeds(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsLo: increment(1) }));
  await assertSucceeds(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsHi: increment(1) }));
});

test('non si può aggiungere più di 1 alla volta', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertFails(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsLo: increment(2) }));
  await assertFails(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsLo: increment(1000) }));
});

test('non si può scrivere un punteggio arbitrario', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertFails(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsLo: 999999 }));
});

test('non si possono togliere voti agli altri', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertFails(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsHi: increment(-1) }));
  await assertFails(updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsHi: 0 }));
});

test('non si possono muovere i due contatori insieme', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertFails(
    updateDoc(doc(db(), 'pairStats', '50_a_c'), {
      winsLo: increment(1), winsHi: increment(1),
    })
  );
  await assertFails(
    updateDoc(doc(db(), 'pairStats', '50_a_c'), {
      winsLo: increment(1), winsHi: increment(-1),
    })
  );
});

test("l'identità della coppia non si può riscrivere", async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertFails(
    updateDoc(doc(db(), 'pairStats', '50_a_c'), { designHi: 'b', winsLo: increment(1) })
  );
  await assertFails(
    updateDoc(doc(db(), 'pairStats', '50_a_c'), { denomination: 5, winsLo: increment(1) })
  );
});

test('un aggiornamento non può aggiungere né togliere campi', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });

  await assertFails(
    updateDoc(doc(db(), 'pairStats', '50_a_c'), { winsLo: increment(1), admin: true })
  );
  // Cancellare un contatore falserebbe la classifica quanto gonfiarlo.
  await assertFails(
    updateDoc(doc(db(), 'pairStats', '50_a_c'), {
      winsLo: increment(1),
      winsHi: deleteField(),
    })
  );
});

/* ---------------------------------------------------- cancellazione e resto */

test('i voti non si cancellano', async () => {
  await seed('50_a_c', { ...PAIR, winsLo: 3, winsHi: 2 });
  await assertFails(deleteDoc(doc(db(), 'pairStats', '50_a_c')));
});

test('nessun accesso a collezioni non previste', async () => {
  await assertFails(getDoc(doc(db(), 'altro', 'x')));
  await assertFails(setDoc(doc(db(), 'altro', 'x'), { qualsiasi: 'cosa' }));
});
