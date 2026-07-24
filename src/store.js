/**
 * Accesso ai dati dei voti.
 *
 * Tre implementazioni dietro la stessa interfaccia:
 *
 *  - FirestoreStore: classifica condivisa su Firebase. Legge la collezione
 *    `pairStats` e registra i voti con un incremento atomico. Le regole di
 *    sicurezza (firebase/firestore.rules) impongono che un voto possa solo
 *    aggiungere 1 a un contatore.
 *  - SupabaseStore: classifica condivisa su Supabase. Legge la tabella
 *    aggregata `pair_stats` e vota tramite la funzione `cast_vote`, che valida
 *    e incrementa in modo atomico. Il client non scrive mai nelle tabelle.
 *  - LocalStore: tutto in localStorage. È la modalità di prova quando nessun
 *    backend è configurato, ed è anche la rete di sicurezza se il backend è
 *    irraggiungibile: il sito resta usabile invece di mostrare una pagina rotta.
 *
 * In tutti i casi si scambiano solo statistiche aggregate per coppia (270 righe
 * al massimo: 6 tagli × 45 coppie), non i singoli voti. La classifica si
 * ricalcola sul client in pochi millisecondi, quindi il server non deve fare
 * altro che contare.
 */

import { BACKEND, FIREBASE, SUPABASE } from '../config.js';

const VOTER_KEY = 'ebr:voter-id';
const LOCAL_STATS_KEY = 'ebr:pair-stats';
const SEEN_KEY = 'ebr:seen-pairs';
const MY_VOTES_KEY = 'ebr:my-votes';

/** Identificativo anonimo e persistente del votante, generato nel browser. */
export function voterId() {
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

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

/* --------------------------------------------------------------- supabase */

class SupabaseStore {
  constructor(url, key) {
    this.mode = 'supabase';
    this.url = url.replace(/\/+$/, '');
    this.key = key;
  }

  get headers() {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
    };
  }

  async loadPairStats() {
    const res = await fetch(
      `${this.url}/rest/v1/pair_stats?select=denomination,design_lo,design_hi,wins_lo,wins_hi`,
      { headers: this.headers }
    );
    if (!res.ok) {
      throw new Error(`Lettura statistiche fallita (HTTP ${res.status}): ${await res.text()}`);
    }
    const rows = await res.json();
    return rows.map((r) => ({
      denomination: Number(r.denomination),
      designLo: r.design_lo,
      designHi: r.design_hi,
      winsLo: Number(r.wins_lo),
      winsHi: Number(r.wins_hi),
    }));
  }

  async submitVote({ denomination, winner, loser }) {
    const res = await fetch(`${this.url}/rest/v1/rpc/cast_vote`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        p_denomination: denomination,
        p_winner: winner,
        p_loser: loser,
        p_voter: voterId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Voto rifiutato (HTTP ${res.status}): ${await res.text()}`);
    }
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

  /** Id del documento di una coppia, es. "50_a_c". Una coppia, un documento. */
  static docId(denomination, lo, hi) {
    return `${denomination}_${lo}_${hi}`;
  }

  async loadPairStats() {
    const stats = [];
    let pageToken = '';

    // Le coppie sono al massimo 270, quindi una pagina basta; il ciclo c'è
    // perché affidarsi a quel "al massimo" sarebbe una scommessa inutile.
    do {
      const url =
        `${this.base}/pairStats?key=${encodeURIComponent(this.apiKey)}&pageSize=300` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Lettura statistiche fallita (HTTP ${res.status}): ${await res.text()}`);
      }

      const body = await res.json();
      // Collezione vuota: Firestore risponde `{}`, senza la chiave documents.
      for (const doc of body.documents || []) {
        const f = doc.fields || {};
        stats.push({
          denomination: Number(f.denomination?.integerValue ?? 0),
          designLo: f.designLo?.stringValue ?? '',
          designHi: f.designHi?.stringValue ?? '',
          winsLo: Number(f.winsLo?.integerValue ?? 0),
          winsHi: Number(f.winsHi?.integerValue ?? 0),
        });
      }
      pageToken = body.nextPageToken || '';
    } while (pageToken);

    return stats;
  }

  async submitVote({ denomination, winner, loser }) {
    const { lo, hi, winnerIsLo } = normaliseVote(denomination, winner, loser);
    const name = `${this.root}/pairStats/${FirestoreStore.docId(denomination, lo, hi)}`;

    // Una sola scrittura fa tutto: crea il documento se non esiste, e in ogni
    // caso incrementa il contatore giusto lato server. Niente lettura prima
    // della scrittura, quindi niente voti persi se due persone votano la
    // stessa coppia nello stesso istante.
    //
    // L'incremento di 0 sul contatore perdente non è inutile: garantisce che
    // alla creazione il documento nasca con entrambi i campi presenti. Senza,
    // il documento avrebbe un contatore solo e le regole di sicurezza — che
    // verificano `winsLo + winsHi == 1` — rifiuterebbero il primo voto.
    const body = {
      writes: [
        {
          update: {
            name,
            fields: {
              denomination: { integerValue: String(denomination) },
              designLo: { stringValue: lo },
              designHi: { stringValue: hi },
            },
          },
          // Senza updateMask la scrittura azzererebbe i contatori esistenti,
          // perché `update` sostituisce il documento con i soli campi elencati.
          updateMask: { fieldPaths: ['denomination', 'designLo', 'designHi'] },
          updateTransforms: [
            { fieldPath: 'winsLo', increment: { integerValue: winnerIsLo ? '1' : '0' } },
            { fieldPath: 'winsHi', increment: { integerValue: winnerIsLo ? '0' : '1' } },
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

/* ----------------------------------------------------------------- fabbrica */

/**
 * Sceglie l'implementazione da usare.
 *
 * Se il backend scelto è configurato ma non risponde si ripiega sulla modalità
 * locale segnalandolo, invece di lasciare il sito senza dati: meglio un sito
 * che funziona con una classifica personale che una pagina rotta.
 */
export async function createStore() {
  let store = null;

  if (BACKEND === 'firebase' && FIREBASE.projectId && FIREBASE.apiKey) {
    store = new FirestoreStore(FIREBASE);
  } else if (BACKEND === 'supabase' && SUPABASE.url && SUPABASE.anonKey) {
    store = new SupabaseStore(SUPABASE.url, SUPABASE.anonKey);
  }

  if (!store) return new LocalStore('non configurato');

  try {
    await store.loadPairStats();
    return store;
  } catch (err) {
    console.warn('Backend non raggiungibile, si continua in locale.', err);
    return new LocalStore('backend non raggiungibile');
  }
}
