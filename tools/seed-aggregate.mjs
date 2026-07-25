/**
 * Seeds stats/all from the old per-pair collection.
 *
 * Why it exists. The counters used to be 270 documents, one per pair, and
 * reading the ranking cost 270 reads. Firestore's free tier gives 50,000 reads
 * a day, so the ranking went dark after fewer than a hundred visits. They now
 * live in a single document — one read — and this script carries the votes
 * already collected across, so switching does not throw them away.
 *
 * It runs once. The rules deliberately forbid creating stats/all, because a
 * create rule would be a way to overwrite the entire ranking with one write,
 * so the seeding window has to be opened by hand:
 *
 *   1. In the Firebase console, publish the rules with `allow create: if true`
 *      on stats/all instead of `if false`.
 *   2. node tools/seed-aggregate.mjs
 *   3. Publish firebase/firestore.rules as it stands in the repository.
 *
 * Step 3 is not optional. Between 1 and 3 anybody who knows the project could
 * replace the document; it is a window of minutes, and the script prints the
 * totals it wrote so you can check nothing else did.
 *
 * Usage:
 *   node tools/seed-aggregate.mjs                  # production, from config.js
 *   node tools/seed-aggregate.mjs --host=host:port # the local emulator
 *   node tools/seed-aggregate.mjs --dry-run        # read and count, write nothing
 */

import { FIREBASE } from '../config.js';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const has = (name) => args.includes(`--${name}`);

const host = flag('host') || FIREBASE.host || '';
const dryRun = has('dry-run');
const projectId = flag('project') || FIREBASE.projectId;
const apiKey = FIREBASE.apiKey;

const origin = host ? `http://${host}` : 'https://firestore.googleapis.com';
const root = `projects/${projectId}/databases/(default)/documents`;
const base = `${origin}/v1/${root}`;
// The emulator honours this header as full admin; against real Firestore it is
// ignored and the API key decides.
const adminHeaders = host ? { Authorization: 'Bearer owner' } : {};

const DENOMINATIONS = [5, 10, 20, 50, 100, 200];
const DESIGNS = 'abcdefghij'.split('');

function counterName(denomination, lo, hi, side) {
  return `d${denomination}_${lo}_${hi}_${side}`;
}

/**
 * Reads with retries. Production is currently rate-limiting reads — the very
 * problem this migration removes — so a single 429 must not abort the job.
 */
async function readWithRetry(url, attempts = 12) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, { headers: adminHeaders });
    if (res.ok) return res.json();
    if (res.status !== 429 || i === attempts) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const wait = Math.min(30000, 2000 * i);
    console.log(`  respinta (429), riprovo fra ${wait / 1000}s… [${i}/${attempts}]`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

/** Every counter at zero: the document must be born complete. */
function emptyCounters() {
  const c = {};
  for (const d of DENOMINATIONS) {
    for (let i = 0; i < DESIGNS.length; i++) {
      for (let j = i + 1; j < DESIGNS.length; j++) {
        c[counterName(d, DESIGNS[i], DESIGNS[j], 'lo')] = 0;
        c[counterName(d, DESIGNS[i], DESIGNS[j], 'hi')] = 0;
      }
    }
  }
  return c;
}

async function readOldCollection() {
  const counters = emptyCounters();
  let documenti = 0;
  let voti = 0;
  let ignorati = 0;
  let pageToken = '';

  do {
    const url =
      `${base}/pairStats?key=${encodeURIComponent(apiKey)}&pageSize=300` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const body = await readWithRetry(url);

    for (const doc of body.documents || []) {
      const f = doc.fields || {};
      const denomination = Number(f.denomination?.integerValue ?? 0);
      const lo = f.designLo?.stringValue ?? '';
      const hi = f.designHi?.stringValue ?? '';
      const winsLo = Number(f.winsLo?.integerValue ?? 0);
      const winsHi = Number(f.winsHi?.integerValue ?? 0);

      const keyLo = counterName(denomination, lo, hi, 'lo');
      const keyHi = counterName(denomination, lo, hi, 'hi');
      // A row that does not map onto a real counter is not silently folded in:
      // it would land in the ranking as a genuine result.
      if (!(keyLo in counters) || !(keyHi in counters)) {
        console.warn(`  riga ignorata, non è una coppia valida: ${doc.name}`);
        ignorati++;
        continue;
      }

      counters[keyLo] += winsLo;
      counters[keyHi] += winsHi;
      documenti++;
      voti += winsLo + winsHi;
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  return { counters, documenti, voti, ignorati };
}

async function writeAggregate(counters) {
  const fields = {};
  for (const [name, value] of Object.entries(counters)) {
    fields[name] = { integerValue: String(value) };
  }

  const res = await fetch(
    `${base}/stats?documentId=all&key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        fields: { last: { stringValue: '' }, c: { mapValue: { fields } } },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Scrittura fallita (HTTP ${res.status}): ${await res.text()}`);
  }
}

async function verify(atteso) {
  const body = await readWithRetry(`${base}/stats/all?key=${encodeURIComponent(apiKey)}`);
  const scritti = body.fields?.c?.mapValue?.fields || {};
  const somma = Object.values(scritti).reduce((a, v) => a + Number(v.integerValue ?? 0), 0);
  return { contatori: Object.keys(scritti).length, voti: somma, atteso };
}

/* --------------------------------------------------------------------- via */

console.log(`progetto: ${projectId}${host ? `  (emulatore ${host})` : ''}`);
console.log('lettura della vecchia collezione pairStats…');

const { counters, documenti, voti, ignorati } = await readOldCollection();
const nonZero = Object.values(counters).filter((v) => v > 0).length;

console.log(`  coppie lette:      ${documenti}`);
console.log(`  voti totali:       ${voti}`);
console.log(`  contatori a zero:  ${Object.keys(counters).length - nonZero} su ${Object.keys(counters).length}`);
if (ignorati) console.log(`  righe ignorate:    ${ignorati}`);

if (dryRun) {
  console.log('\n--dry-run: non scrivo niente.');
  process.exit(0);
}

console.log('\nscrittura di stats/all…');
await writeAggregate(counters);

const esito = await verify(voti);
console.log(`  contatori scritti: ${esito.contatori}`);
console.log(`  voti nel documento: ${esito.voti}`);

if (esito.voti !== voti || esito.contatori !== Object.keys(counters).length) {
  console.error('\nNON CORRISPONDE: il documento scritto non riporta gli stessi totali.');
  process.exit(1);
}

console.log('\nFatto. Ora ripubblica firebase/firestore.rules cosi\' come sta nel repository,');
console.log("in modo che 'allow create' torni a essere false.");
