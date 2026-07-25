/**
 * Accesso ai dati dei voti.
 *
 * Due implementazioni dietro la stessa interfaccia:
 *
 *  - FirestoreStore: shared ranking on Firebase. Reads the single document
 *    `stats/all`, which holds all 540 counters, and records votes with an
 *    atomic increment. The security rules (firebase/firestore.rules) allow a
 *    write to do nothing but add 1 to one counter.
 *  - LocalStore: tutto in localStorage. È la modalità di prova quando nessun
 *    backend è configurato, ed è anche la rete di sicurezza se il backend è
 *    irraggiungibile: il sito resta usabile invece di mostrare una pagina rotta.
 *
 * Either way only aggregate per-pair counts travel (270 pairs at most: 6
 * denominations × 45 pairs), never individual votes. The ranking is recomputed
 * in the browser in a few milliseconds, so the server does nothing but count.
 */

import { BACKEND, FIREBASE } from '../config.js';

const LOCAL_STATS_KEY = 'ebr:pair-stats';
const SEEN_KEY = 'ebr:seen-pairs';
const MY_VOTES_KEY = 'ebr:my-votes';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota esaurita o storage disabilitato: si può proseguire senza memoria.
  }
}

/** Coppie già mostrate a questo votante, per non riproporgliele. */
export function loadSeenPairs() {
  return new Set(readJson(SEEN_KEY, []));
}

export function markPairSeen(key) {
  const seen = loadSeenPairs();
  seen.add(key);
  // Si conservano le ultime 400 per non far crescere lo storage all'infinito.
  const trimmed = [...seen].slice(-400);
  writeJson(SEEN_KEY, trimmed);
}

/** Numero di voti espressi da questo browser, mostrato nell'interfaccia. */
export function myVoteCount() {
  return readJson(MY_VOTES_KEY, 0);
}

export function bumpMyVoteCount() {
  const n = myVoteCount() + 1;
  writeJson(MY_VOTES_KEY, n);
  return n;
}

function normaliseVote(denomination, winner, loser) {
  const [lo, hi] = winner < loser ? [winner, loser] : [loser, winner];
  return { lo, hi, winnerIsLo: winner === lo, denomination };
}

/* ------------------------------------------------------------------ locale */

class LocalStore {
  constructor(reason) {
    this.mode = 'local';
    this.reason = reason;
  }

  async loadPairStats() {
    const raw = readJson(LOCAL_STATS_KEY, {});
    return Object.entries(raw).map(([key, v]) => {
      const [denomination, designLo, designHi] = key.split('|');
      return {
        denomination: Number(denomination),
        designLo,
        designHi,
        winsLo: v[0],
        winsHi: v[1],
      };
    });
  }

  async submitVote({ denomination, winner, loser }) {
    const { lo, hi, winnerIsLo } = normaliseVote(denomination, winner, loser);
    const raw = readJson(LOCAL_STATS_KEY, {});
    const key = `${denomination}|${lo}|${hi}`;
    const cur = raw[key] || [0, 0];
    raw[key] = winnerIsLo ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1];
    writeJson(LOCAL_STATS_KEY, raw);
  }
}

/* -------------------------------------------------------------- firestore */

/**
 * Firestore via API REST, senza SDK: il sito resta senza dipendenze e senza
 * build, e non deve scaricare nulla da una CDN per funzionare.
 *
 * L'API REST rappresenta i valori con il tipo esplicito — un intero viaggia
 * come `{"integerValue": "5"}`, per giunta con il numero in forma di stringa
 * perché JSON non regge gli interi a 64 bit. Le due funzioni di conversione
 * qui sotto isolano questa stranezza dal resto del codice.
 */
export class FirestoreStore {
  /**
   * `host` è opzionale e serve a puntare all'emulatore locale (es.
   * "127.0.0.1:8080") invece del Firestore vero: lo usano i test, ed è comodo
   * anche per provare le regole di sicurezza in locale prima di pubblicarle.
   */
  constructor({ projectId, apiKey, host }) {
    this.mode = 'firebase';
    this.projectId = projectId;
    this.apiKey = apiKey;
    this.root = `projects/${projectId}/databases/(default)/documents`;
    this.origin = host ? `http://${host}` : 'https://firestore.googleapis.com';
    this.base = `${this.origin}/v1/${this.root}`;
  }

  /**
   * Name of one counter: denomination, the two designs in alphabetical order,
   * and which of the two won. The leading "d" is not decoration — a Firestore
   * field path segment cannot start with a digit without being backquoted, and
   * `c.d50_a_c_lo` is easier to get right than `c.` + backticks.
   */
  static counterName(denomination, lo, hi, side) {
    return `d${denomination}_${lo}_${hi}_${side}`;
  }

  /**
   * One read. All 540 counters live in stats/all, so the whole ranking costs a
   * single document read instead of one per pair.
   */
  async loadPairStats() {
    const res = await fetch(
      `${this.base}/stats/all?key=${encodeURIComponent(this.apiKey)}`
    );

    // A fresh install with nothing seeded yet: an empty ranking, not an error.
    //
    // 404 only, deliberately. A 403 falls through and throws: it means the
    // rules are refusing the read, and the caller turns that into the "last
    // shared copy, not being refreshed" state, which says so out loud. During
    // the migration this branch also fell back to the old per-pair collection;
    // that fallback is gone, because now that stats/all exists it would have
    // served frozen counts as if they were live, and said nothing.
    if (res.status === 404) return [];

    if (!res.ok) {
      throw new Error(`Lettura statistiche fallita (HTTP ${res.status}): ${await res.text()}`);
    }

    const body = await res.json();
    const counters = body.fields?.c?.mapValue?.fields || {};

    // The counters are flat; the rest of the code thinks in pairs, so they are
    // folded back into one row per pair here. Nothing above this line needs to
    // know that the storage shape changed.
    const byPair = new Map();
    for (const [name, value] of Object.entries(counters)) {
      const m = /^d(\d+)_([a-j])_([a-j])_(lo|hi)$/.exec(name);
      if (!m) continue;
      const [, denom, lo, hi, side] = m;
      const key = `${denom}|${lo}|${hi}`;
      let row = byPair.get(key);
      if (!row) {
        row = { denomination: Number(denom), designLo: lo, designHi: hi, winsLo: 0, winsHi: 0 };
        byPair.set(key, row);
      }
      row[side === 'lo' ? 'winsLo' : 'winsHi'] = Number(value.integerValue ?? 0);
    }

    // Pairs nobody has voted on yet carry no information: dropping them keeps
    // the array small and matches what the caller used to receive.
    return [...byPair.values()].filter((r) => r.winsLo + r.winsHi > 0);
  }

  async submitVote({ denomination, winner, loser }) {
    const { lo, hi, winnerIsLo } = normaliseVote(denomination, winner, loser);
    const counter = FirestoreStore.counterName(denomination, lo, hi, winnerIsLo ? 'lo' : 'hi');
    const name = `${this.root}/stats/all`;

    // The increment happens on the server, so two people voting on the same
    // pair in the same instant both count — no read before the write, nothing
    // to lose. `last` is not bookkeeping: the rules read it to know which
    // counter this write claims to be touching, and then check the claim.
    const body = {
      writes: [
        {
          update: { name, fields: { last: { stringValue: counter } } },
          // Without updateMask the write would replace the document with just
          // the fields listed, wiping all 540 counters in one go.
          updateMask: { fieldPaths: ['last'] },
          updateTransforms: [
            { fieldPath: `c.${counter}`, increment: { integerValue: '1' } },
          ],
        },
      ],
    };

    const res = await fetch(
      `${this.origin}/v1/${this.root}:commit?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      throw new Error(`Voto rifiutato (HTTP ${res.status}): ${await res.text()}`);
    }
  }
}

/* ------------------------------------------------------------ ultima copia */

/**
 * Last shared ranking that actually arrived, kept in this browser.
 *
 * It is not a speed optimisation: it is what the page shows when the backend
 * says no. Without it a visitor whose read fails sees a ranking built from
 * their own handful of votes — which looks like the collective ranking, but
 * is not. A saved copy, declared as such, is closer to the truth.
 */
const CACHE_KEY = 'ebr:last-shared-stats';

function saveSharedStats(stats) {
  writeJson(CACHE_KEY, { at: Date.now(), stats });
}

function loadSharedStats() {
  const cached = readJson(CACHE_KEY, null);
  return cached && Array.isArray(cached.stats) ? cached : null;
}

/* ----------------------------------------------------------------- fabbrica */

/**
 * Picks the implementation to use, and brings back the statistics it read
 * while doing so.
 *
 * Returning the stats is the point. This function used to load the statistics
 * just to see whether the backend answered, throw the result away, and let the
 * caller ask for it again — two full loads per visit. Back when the counters
 * were 270 separate documents that meant 540 reads a visit, and Firestore's
 * 50,000 free daily reads divided by 540 is about ninety visits: the quota ran
 * out one morning and the shared ranking went dark for everyone. The counters
 * now live in one document, so a visit costs one read — but reading twice for
 * no reason would still be reading twice for no reason.
 *
 * If the backend is configured but refuses, the site falls back to local mode
 * rather than showing a broken page — but it hands over the last shared
 * ranking it saw, so the visitor still gets the real standings instead of a
 * chart of their own six votes.
 *
 * @returns {Promise<{store: object, stats: Array, staleSince: number|null}>}
 */
export async function createStore() {
  let store = null;

  if (BACKEND === 'firebase' && FIREBASE.projectId && FIREBASE.apiKey) {
    store = new FirestoreStore(FIREBASE);
  }

  if (!store) {
    const local = new LocalStore('non configurato');
    return { store: local, stats: await local.loadPairStats(), staleSince: null };
  }

  try {
    const stats = await store.loadPairStats();
    saveSharedStats(stats);
    return { store, stats, staleSince: null };
  } catch (err) {
    console.warn('Backend non raggiungibile, si continua in locale.', err);
    const local = new LocalStore('backend non raggiungibile');
    const cached = loadSharedStats();
    if (cached) return { store: local, stats: cached.stats, staleSince: cached.at };
    return { store: local, stats: await local.loadPairStats(), staleSince: null };
  }
}
