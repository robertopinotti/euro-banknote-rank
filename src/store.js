/**
 * Accesso ai dati dei voti.
 *
 * Due implementazioni dietro la stessa interfaccia:
 *
 *  - SupabaseStore: classifica condivisa. Legge la tabella aggregata `pair_stats`
 *    e registra i voti tramite la funzione `cast_vote`, che valida e incrementa
 *    in modo atomico. Il client non scrive mai direttamente nelle tabelle.
 *  - LocalStore: tutto in localStorage. Serve come modalità di prova quando
 *    Supabase non è configurato, e come rete di sicurezza se il backend è
 *    irraggiungibile: il sito resta usabile invece di mostrare una pagina rotta.
 *
 * Si scambiano solo statistiche aggregate per coppia (270 righe al massimo:
 * 6 tagli × 45 coppie), non i singoli voti. La classifica si ricalcola sul client
 * in pochi millisecondi, quindi il server non deve fare altro che contare.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

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

/* ----------------------------------------------------------------- fabbrica */

/**
 * Sceglie l'implementazione da usare. Se Supabase è configurato ma non risponde
 * si ripiega sulla modalità locale, segnalandolo, invece di lasciare il sito
 * senza dati.
 */
export async function createStore() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new LocalStore('non configurato');
  }

  const store = new SupabaseStore(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    await store.loadPairStats();
    return store;
  } catch (err) {
    console.warn('Backend non raggiungibile, si continua in locale.', err);
    return new LocalStore('backend non raggiungibile');
  }
}
