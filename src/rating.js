/**
 * Motore di classifica.
 *
 * Modello: Bradley–Terry. A ogni design i è associata una "forza" p_i > 0 e
 *
 *     P(i batte j) = p_i / (p_i + p_j)
 *
 * La stima di massima verosimiglianza si ottiene con l'algoritmo MM di Hunter
 * (2004), che a ogni iterazione aggiorna
 *
 *     p_i  <-  W_i / Σ_{j≠i} [ N_ij / (p_i + p_j) ]
 *
 * dove W_i è il numero di vittorie di i e N_ij il numero di confronti tra i e j.
 * L'aggiornamento non decresce mai la verosimiglianza e converge all'ottimo.
 *
 * Problema: se un design vince (o perde) tutti i confronti, la MLE non esiste —
 * la forza tende a +∞ (o 0). Si aggiunge quindi un avversario virtuale di forza
 * fissa 1 contro cui ogni design ha `prior` vittorie e `prior` sconfitte. È una
 * regolarizzazione bayesiana: rende la stima sempre finita, àncora la scala
 * (niente normalizzazione arbitraria) e tira i design con pochi voti verso il
 * centro, che è esattamente il comportamento voluto all'inizio della votazione.
 *
 * Il punteggio mostrato è la forza convertita sulla scala Elo:
 *
 *     R_i = 1500 + (400 / ln 10) · ln p_i
 *
 * Così 400 punti di differenza ⇒ 10 a 1 di probabilità di vittoria, come nel
 * punteggio Elo a cui il pubblico è abituato, ma senza la dipendenza dall'ordine
 * dei voti: rigiocando gli stessi confronti in ordine diverso il risultato non
 * cambia.
 */

const ELO_SCALE = 400 / Math.LN10; // ≈ 173.7
const ELO_BASE = 1500;

/** Converte una forza Bradley–Terry nella scala Elo. */
export function strengthToElo(p) {
  return ELO_BASE + ELO_SCALE * Math.log(p);
}

/**
 * Stima Bradley–Terry per un singolo girone (un taglio di banconota).
 *
 * @param {string[]} items            id dei design in gara
 * @param {Map<string, number>} wins  id -> vittorie totali
 * @param {Map<string, number>} pairN chiave "i|j" (i<j) -> confronti tra i e j
 * @param {object} [opts]
 * @param {number} [opts.prior=1]     confronti virtuali contro l'avversario di forza 1
 * @param {number} [opts.tol=1e-10]   soglia di convergenza sul massimo scarto relativo
 * @param {number} [opts.maxIter=500] iterazioni massime
 * @returns {{strength: Map<string, number>, iterations: number, converged: boolean}}
 */
export function bradleyTerry(items, wins, pairN, opts = {}) {
  const { prior = 1, tol = 1e-10, maxIter = 500 } = opts;

  // Partenza da forze tutte uguali a 1: punto neutro, nessun design favorito.
  const p = new Map(items.map((id) => [id, 1]));

  let iterations = 0;
  let converged = false;

  for (; iterations < maxIter; iterations++) {
    let maxDelta = 0;

    // Aggiornamento sequenziale (Gauss–Seidel): ogni p_i usa subito i valori già
    // aggiornati in questo giro. È la forma in cui Hunter presenta l'algoritmo e
    // converge molto più in fretta della variante simultanea, che sugli stessi
    // dati resta lontana dall'ottimo anche dopo decine di migliaia di iterazioni.
    for (const i of items) {
      const pi = p.get(i);

      // Denominatore: contributo dei confronti reali...
      let denom = 0;
      for (const j of items) {
        if (i === j) continue;
        const n = pairN.get(pairKeyOf(i, j)) || 0;
        if (n === 0) continue;
        denom += n / (pi + p.get(j));
      }
      // ...più i 2·prior confronti virtuali contro l'avversario di forza 1.
      denom += (2 * prior) / (pi + 1);

      const numer = (wins.get(i) || 0) + prior;
      const pNew = denom > 0 ? numer / denom : 1;

      p.set(i, pNew);
      maxDelta = Math.max(maxDelta, Math.abs(pNew - pi) / pi);
    }

    // Passo di scala. Da solo l'MM converge lentissimamente lungo la direzione
    // "moltiplica tutte le forze per c": i rapporti si assestano in poche
    // decine di iterazioni, la scala assoluta striscia per decine di migliaia.
    // Si risolve esattamente: la verosimiglianza dei confronti reali è
    // invariante per scala, quindi il c ottimale dipende solo dal termine di
    // regolarizzazione ed è la radice di Σ_i (1 − c·p_i)/(1 + c·p_i) = 0.
    const c = optimalScale([...p.values()], prior);
    if (c !== 1) {
      for (const i of items) p.set(i, p.get(i) * c);
      maxDelta = Math.max(maxDelta, Math.abs(c - 1));
    }

    if (maxDelta < tol) {
      converged = true;
      iterations++;
      break;
    }
  }

  return { strength: p, iterations, converged };
}

function pairKeyOf(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Fattore c > 0 che massimizza la verosimiglianza lungo la direzione di scala.
 * La funzione g(c) = Σ_i (1 − c·p_i)/(1 + c·p_i) vale n in 0, tende a −n
 * all'infinito ed è strettamente decrescente: una bisezione in scala
 * logaritmica trova la radice con poche decine di passi.
 *
 * Senza regolarizzazione (prior ≤ 0) la scala è indeterminata e si ripiega
 * sulla normalizzazione classica: media geometrica delle forze pari a 1.
 */
function optimalScale(values, prior) {
  if (values.length === 0) return 1;

  if (prior <= 0) {
    const meanLog = values.reduce((a, v) => a + Math.log(v), 0) / values.length;
    return Math.exp(-meanLog);
  }

  const g = (c) => values.reduce((acc, v) => acc + (1 - c * v) / (1 + c * v), 0);

  let lo = 1e-12;
  let hi = 1e12;
  if (g(lo) < 0) return lo;
  if (g(hi) > 0) return hi;

  for (let k = 0; k < 200; k++) {
    const mid = Math.sqrt(lo * hi); // bisezione sul logaritmo
    if (g(mid) > 0) lo = mid;
    else hi = mid;
    if (hi / lo - 1 < 1e-14) break;
  }
  return Math.sqrt(lo * hi);
}

/**
 * Trasforma le statistiche aggregate delle coppie nelle classifiche complete.
 *
 * @param {Array<{denomination:number, designLo:string, designHi:string, winsLo:number, winsHi:number}>} pairStats
 * @param {string[]} designIds
 * @param {number[]} denominations
 * @param {object} [opts]
 * @returns {{
 *   byDenomination: Map<number, Array<object>>,
 *   families: Array<object>,
 *   totalVotes: number
 * }}
 */
export function computeRankings(pairStats, designIds, denominations, opts = {}) {
  const prior = opts.prior ?? 1;

  // Raggruppa le statistiche per taglio.
  const perDenom = new Map(denominations.map((d) => [d, []]));
  let totalVotes = 0;
  for (const s of pairStats) {
    const bucket = perDenom.get(s.denomination);
    if (!bucket) continue; // taglio sconosciuto: ignora invece di falsare i conti
    bucket.push(s);
    totalVotes += s.winsLo + s.winsHi;
  }

  const byDenomination = new Map();

  for (const denom of denominations) {
    const wins = new Map(designIds.map((id) => [id, 0]));
    const losses = new Map(designIds.map((id) => [id, 0]));
    const pairN = new Map();

    for (const s of perDenom.get(denom)) {
      const n = s.winsLo + s.winsHi;
      if (n === 0) continue;
      pairN.set(pairKeyOf(s.designLo, s.designHi), n);
      wins.set(s.designLo, (wins.get(s.designLo) || 0) + s.winsLo);
      wins.set(s.designHi, (wins.get(s.designHi) || 0) + s.winsHi);
      losses.set(s.designLo, (losses.get(s.designLo) || 0) + s.winsHi);
      losses.set(s.designHi, (losses.get(s.designHi) || 0) + s.winsLo);
    }

    const { strength } = bradleyTerry(designIds, wins, pairN, { prior });

    const rows = designIds.map((id) => {
      const w = wins.get(id) || 0;
      const l = losses.get(id) || 0;
      return {
        designId: id,
        denomination: denom,
        strength: strength.get(id),
        logStrength: Math.log(strength.get(id)),
        elo: strengthToElo(strength.get(id)),
        wins: w,
        losses: l,
        played: w + l,
      };
    });

    rows.sort((a, b) => b.strength - a.strength);
    rows.forEach((r, i) => (r.rank = i + 1));
    byDenomination.set(denom, rows);
  }

  // Classifica dei disegni interi: media delle log-forze sui 6 tagli.
  // Si media in scala logaritmica (non sulle forze grezze) perché è la scala in
  // cui il modello è lineare; la media aritmetica delle forze premierebbe in
  // modo sproporzionato un singolo taglio molto forte.
  const families = designIds.map((id) => {
    const perNote = denominations.map((d) =>
      byDenomination.get(d).find((r) => r.designId === id)
    );
    const meanLog =
      perNote.reduce((acc, r) => acc + r.logStrength, 0) / perNote.length;
    const wins = perNote.reduce((a, r) => a + r.wins, 0);
    const losses = perNote.reduce((a, r) => a + r.losses, 0);

    return {
      designId: id,
      elo: ELO_BASE + ELO_SCALE * meanLog,
      logStrength: meanLog,
      strength: Math.exp(meanLog),
      wins,
      losses,
      played: wins + losses,
    };
  });

  families.sort((a, b) => b.strength - a.strength);
  families.forEach((f, i) => (f.rank = i + 1));

  return { byDenomination, families, totalVotes };
}

/**
 * Sceglie la prossima coppia da mostrare.
 *
 * Due obiettivi in tensione: coprire tutte le 45 coppie di ogni taglio, e
 * spendere i voti sui confronti che riducono di più l'incertezza. La coppia più
 * informativa è quella tra design di forza simile (un confronto il cui esito è
 * già scontato non insegna nulla). Si combinano i due criteri in un peso
 *
 *     peso = 1/(1 + n_coppia) · informativitàᵞ
 *
 * dove l'informatività è 4·p·(1−p) ∈ (0,1], massima quando i due sono pari, e
 * si estrae poi una coppia a caso con quel peso. L'estrazione casuale, invece
 * della scelta del massimo, evita che tutti i votanti vedano la stessa coppia.
 *
 * @param {Array<[string,string]>} pairs      tutte le coppie possibili
 * @param {Map<string, number>} pairCounts    chiave "denom|lo|hi" -> voti già raccolti
 * @param {Map<string, number>} strength      forze correnti per il taglio scelto
 * @param {number} denomination
 * @param {Set<string>} [seen]                coppie già mostrate a questo votante
 * @param {() => number} [rng]
 */
export function pickPair(pairs, pairCounts, strength, denomination, seen = new Set(), rng = Math.random) {
  const candidates = [];
  let totalWeight = 0;

  for (const [lo, hi] of pairs) {
    const key = `${denomination}|${lo}|${hi}`;
    if (seen.has(key)) continue;

    const n = pairCounts.get(key) || 0;
    const pLo = strength?.get(lo) ?? 1;
    const pHi = strength?.get(hi) ?? 1;
    const prob = pLo / (pLo + pHi);
    const informativeness = 4 * prob * (1 - prob);

    const weight = (1 / (1 + n)) * Math.pow(informativeness, 0.5);
    candidates.push({ pair: [lo, hi], key, weight });
    totalWeight += weight;
  }

  // Il votante ha già visto tutte le coppie di questo taglio: si riparte da zero.
  if (candidates.length === 0) {
    const [lo, hi] = pairs[Math.floor(rng() * pairs.length)];
    return { pair: [lo, hi], key: `${denomination}|${lo}|${hi}`, exhausted: true };
  }

  let r = rng() * totalWeight;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return { ...c, exhausted: false };
  }
  const last = candidates[candidates.length - 1];
  return { ...last, exhausted: false };
}
