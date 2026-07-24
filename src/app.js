/**
 * Controller dell'interfaccia: instradamento fra le viste, gestione della
 * sfida a due, rendering delle classifiche.
 */

import {
  DESIGNS,
  DESIGNS_BY_ID,
  DENOMINATIONS,
  THEMES,
  imageUrl,
  hasBack,
  allPairs,
} from './data.js';

import { computeRankings, pickPair, winProbability } from './rating.js';

import {
  createStore,
  loadSeenPairs,
  markPairSeen,
  myVoteCount,
  bumpMyVoteCount,
} from './store.js';

const PAIRS = allPairs();
const DESIGN_IDS = DESIGNS.map((d) => d.id);

const state = {
  store: null,
  stats: [],          // [{denomination, designLo, designHi, winsLo, winsHi}]
  rankings: null,
  rankDenom: 5,       // taglio scelto nella classifica per taglio
  rankScope: 'famiglie',
  current: null,      // sfida in corso
  showingBack: false,
  seen: loadSeenPairs(),
  busy: false,
};

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------ instradamento */

const VIEWS = ['vota', 'classifica', 'design', 'metodo'];

function currentView() {
  const hash = location.hash.replace('#', '');
  return VIEWS.includes(hash) ? hash : 'vota';
}

function showView(name) {
  for (const v of VIEWS) {
    $(`view-${v}`).hidden = v !== name;
  }
  for (const link of document.querySelectorAll('.nav a')) {
    link.classList.toggle('is-active', link.dataset.view === name);
  }
  if (name === 'classifica') renderRankings();
  if (name === 'design') renderDesignGallery();
  window.scrollTo(0, 0);
}

/* -------------------------------------------------------- indici sui dati */

/** Mappa "denom|lo|hi" -> numero di confronti già raccolti. */
function pairCountMap() {
  const m = new Map();
  for (const s of state.stats) {
    m.set(`${s.denomination}|${s.designLo}|${s.designHi}`, s.winsLo + s.winsHi);
  }
  return m;
}

function strengthMapFor(denom) {
  const rows = state.rankings?.byDenomination.get(denom);
  if (!rows) return new Map(DESIGN_IDS.map((id) => [id, 1]));
  return new Map(rows.map((r) => [r.designId, r.strength]));
}

function recompute() {
  state.rankings = computeRankings(state.stats, DESIGN_IDS, DENOMINATIONS);
}

/** Applica un voto agli aggregati in memoria, senza aspettare il server. */
function applyVoteLocally(denomination, winner, loser) {
  const [lo, hi] = winner < loser ? [winner, loser] : [loser, winner];
  let row = state.stats.find(
    (s) => s.denomination === denomination && s.designLo === lo && s.designHi === hi
  );
  if (!row) {
    row = { denomination, designLo: lo, designHi: hi, winsLo: 0, winsHi: 0 };
    state.stats.push(row);
  }
  if (winner === lo) row.winsLo += 1;
  else row.winsHi += 1;
  return row;
}

function undoVoteLocally(denomination, winner, loser) {
  const [lo, hi] = winner < loser ? [winner, loser] : [loser, winner];
  const row = state.stats.find(
    (s) => s.denomination === denomination && s.designLo === lo && s.designHi === hi
  );
  if (!row) return;
  if (winner === lo) row.winsLo = Math.max(0, row.winsLo - 1);
  else row.winsHi = Math.max(0, row.winsHi - 1);
}

/* --------------------------------------------------------------- la sfida */

// Il taglio è sempre sorteggiato: chi vota confronta i design, non i tagli.
function nextDenomination() {
  return DENOMINATIONS[Math.floor(Math.random() * DENOMINATIONS.length)];
}

function nextChallenge() {
  const denom = nextDenomination();
  const chosen = pickPair(PAIRS, pairCountMap(), strengthMapFor(denom), denom, state.seen);

  // Chi sta a sinistra si sorteggia: mostrare sempre la lettera minore per
  // prima introdurrebbe un vantaggio di posizione sistematico.
  const [a, b] = chosen.pair;
  const [left, right] = Math.random() < 0.5 ? [a, b] : [b, a];

  state.current = { denomination: denom, key: chosen.key, left, right };
  state.showingBack = false;
  renderArena();
  preloadNext(denom);
}

function renderArena() {
  const { denomination, left, right } = state.current;
  const side = state.showingBack && hasBack(denomination) ? 'back' : 'front';

  for (const [pos, id] of [['left', left], ['right', right]]) {
    const img = $(`img-${pos}`);
    img.classList.add('is-loading');
    img.onload = () => img.classList.remove('is-loading');
    img.src = imageUrl(id, denomination, side);
    img.alt = `Proposta ${DESIGNS_BY_ID[id].letter}, banconota da ${denomination} euro`;
    $(`letter-${pos}`).textContent = `Proposta ${DESIGNS_BY_ID[id].letter}`;
    $(`designer-${pos}`).textContent = DESIGNS_BY_ID[id].designer;
    $(`card-${pos}`).classList.remove('is-chosen');
  }

  const flip = $('btn-flip');
  flip.hidden = !hasBack(denomination);
  flip.textContent = state.showingBack ? 'Torna al fronte' : 'Guarda il retro';

  $('arena').classList.remove('is-voting');
  updateVoteCount();
}

/** Scalda la cache del browser con le immagini della sfida successiva. */
function preloadNext(denom) {
  const guess = pickPair(PAIRS, pairCountMap(), strengthMapFor(denom), denom, state.seen);
  for (const id of guess.pair) {
    const img = new Image();
    img.src = imageUrl(id, denom, 'front');
  }
}

/**
 * Vero quando i voti finiscono su un backend condiviso. Si guarda cosa *non* è
 * locale invece di elencare i fornitori: aggiungerne uno domani non deve
 * richiedere di ricordarsi di toccare anche qui.
 */
function isShared() {
  return state.store != null && state.store.mode !== 'local';
}

function updateVoteCount() {
  const mine = myVoteCount();
  const total = state.rankings?.totalVotes ?? 0;
  const parts = [];
  parts.push(mine === 1 ? 'Hai espresso 1 voto' : `Hai espresso ${mine} voti`);
  if (isShared()) {
    parts.push(total === 1 ? '1 voto in tutto' : `${total.toLocaleString('it-IT')} voti in tutto`);
  }
  $('vote-count').textContent = parts.join(' · ');
}

async function vote(position) {
  if (state.busy || !state.current) return;
  state.busy = true;

  const { denomination, left, right, key } = state.current;
  const winner = position === 'left' ? left : right;
  const loser = position === 'left' ? right : left;

  $(`card-${position}`).classList.add('is-chosen');
  $('arena').classList.add('is-voting');

  // Aggiornamento ottimistico: la classifica si muove subito, la conferma del
  // server arriva dopo. Se il voto viene rifiutato si torna indietro.
  applyVoteLocally(denomination, winner, loser);
  recompute();
  bumpMyVoteCount();
  state.seen.add(key);
  markPairSeen(key);

  try {
    await state.store.submitVote({ denomination, winner, loser });
  } catch (err) {
    console.error(err);
    undoVoteLocally(denomination, winner, loser);
    recompute();
    showBanner('Il voto non è stato registrato: controlla la connessione e riprova.');
  }

  // Breve pausa perché il segnale verde di conferma sia percepibile.
  setTimeout(() => {
    state.busy = false;
    nextChallenge();
  }, 180);
}

function skip() {
  if (state.busy || !state.current) return;
  state.seen.add(state.current.key);
  markPairSeen(state.current.key);
  nextChallenge();
}

function showBanner(text) {
  const el = $('mode-banner');
  el.textContent = text;
  el.hidden = false;
}

/* ---------------------------------------------------------- classifiche */

function themeTag(design) {
  const t = THEMES[design.theme];
  return `<span class="tag ${t.id}">${t.short}</span>`;
}

function rankRow(entry, denomination, maxElo, minElo) {
  const design = DESIGNS_BY_ID[entry.designId];
  const span = Math.max(1, maxElo - minElo);
  // La barra parte dall'8% invece che da zero: l'ultimo in classifica resta
  // comunque visibile, e il confronto fra le lunghezze resta leggibile.
  const pct = 8 + ((entry.elo - minElo) / span) * 92;
  const thumbDenom = denomination ?? 50;

  const record =
    entry.played > 0
      ? `${entry.wins} vittorie su ${entry.played} · ${Math.round(entry.winRate * 100)}%`
      : 'nessun voto';

  return `
    <li class="rank-row ${entry.rank === 1 ? 'is-first' : ''}">
      <div class="rank-pos">${entry.rank}</div>
      <div class="rank-thumb">
        <img src="${imageUrl(entry.designId, thumbDenom)}" alt="" loading="lazy">
      </div>
      <div class="rank-info">
        <div class="rank-name">Proposta ${design.letter}${themeTag(design)}</div>
        <div class="rank-designer">${design.designer}</div>
      </div>
      <div class="rank-score">
        <span class="rank-elo">${Math.round(entry.elo)}</span>
        <span class="rank-err">± ${Math.round(entry.eloError)}</span>
        <span class="rank-record">${record}</span>
      </div>
      <div class="rank-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
    </li>`;
}

function renderRankings() {
  if (!state.rankings) return;

  const { families, totalVotes } = state.rankings;

  const modeNote = isShared()
    ? 'Classifica condivisa da tutti i votanti.'
    : 'Modalità locale: questa classifica conta solo i tuoi voti, salvati in questo browser.';

  $('rank-summary').textContent =
    totalVotes === 0
      ? `Nessun voto ancora. ${modeNote}`
      : `${totalVotes.toLocaleString('it-IT')} confronti raccolti. ${modeNote}`;

  // Per design
  const famElos = families.map((f) => f.elo);
  $('ranking-list').innerHTML = families
    .map((f) => rankRow(f, null, Math.max(...famElos), Math.min(...famElos)))
    .join('');

  // Per taglio
  const rows = state.rankings.byDenomination.get(state.rankDenom);
  const elos = rows.map((r) => r.elo);
  $('ranking-denom-list').innerHTML = rows
    .map((r) => rankRow(r, state.rankDenom, Math.max(...elos), Math.min(...elos)))
    .join('');

  renderMatrix(rows);
}

function renderMatrix(rows) {
  const ordered = rows; // già ordinate per forza decrescente
  const head = `<thead><tr><th></th>${ordered
    .map((r) => `<th>${DESIGNS_BY_ID[r.designId].letter}</th>`)
    .join('')}</tr></thead>`;

  const body = ordered
    .map((r) => {
      const cells = ordered
        .map((c) => {
          if (r.designId === c.designId) return '<td class="self">—</td>';
          const p = winProbability(r.strength, c.strength);
          // Intensità proporzionale allo scostamento dal 50%: una cella al 50%
          // resta neutra, una al 90% è ben visibile.
          const intensity = Math.round(Math.abs(p - 0.5) * 2 * 55);
          const color = p >= 0.5 ? 'var(--win)' : 'var(--gold)';
          return `<td style="background:color-mix(in srgb, ${color} ${intensity}%, var(--bg-sunken))">${Math.round(p * 100)}%</td>`;
        })
        .join('');
      return `<tr><th>${DESIGNS_BY_ID[r.designId].letter}</th>${cells}</tr>`;
    })
    .join('');

  $('matrix').innerHTML = `${head}<tbody>${body}</tbody>`;
}

/* ------------------------------------------------------------- i design */

let galleryRendered = false;

function renderDesignGallery() {
  if (galleryRendered) return;
  galleryRendered = true;

  $('design-grid').innerHTML = DESIGNS.map((d) => {
    const strip = DENOMINATIONS.map(
      (den) =>
        `<img src="${imageUrl(d.id, den)}" alt="Proposta ${d.letter}, ${den} euro" loading="lazy">`
    ).join('');

    return `
      <article class="design-card">
        <figure>
          <img src="${imageUrl(d.id, 50)}" alt="Proposta ${d.letter}, banconota da 50 euro" loading="lazy">
        </figure>
        <div class="design-body">
          <h3>Proposta ${d.letter}${themeTag(d)}</h3>
          <p class="who">${d.designer}</p>
          <p class="desc">${d.description}</p>
        </div>
        <div class="design-strip">${strip}</div>
      </article>`;
  }).join('');
}

/* ------------------------------------------------------------- controlli */

function buildDenomButtons(container, { selected, onPick }) {
  container.innerHTML = DENOMINATIONS
    .map(
      (d) =>
        `<button type="button" class="denom-btn ${d === selected ? 'is-active' : ''}" data-value="${d}">${d} €</button>`
    )
    .join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.denom-btn');
    if (!btn) return;
    for (const b of container.querySelectorAll('.denom-btn')) {
      b.classList.toggle('is-active', b === btn);
    }
    onPick(Number(btn.dataset.value));
  });
}

function wireControls() {
  $('card-left').addEventListener('click', () => vote('left'));
  $('card-right').addEventListener('click', () => vote('right'));
  $('btn-skip').addEventListener('click', skip);

  $('btn-flip').addEventListener('click', () => {
    state.showingBack = !state.showingBack;
    renderArena();
  });

  buildDenomButtons($('rank-denom-buttons'), {
    selected: state.rankDenom,
    onPick: (value) => {
      state.rankDenom = value;
      renderRankings();
    },
  });

  for (const btn of document.querySelectorAll('.seg-btn')) {
    btn.addEventListener('click', () => {
      state.rankScope = btn.dataset.scope;
      for (const b of document.querySelectorAll('.seg-btn')) {
        b.classList.toggle('is-active', b === btn);
      }
      $('rank-families').hidden = state.rankScope !== 'famiglie';
      $('rank-denoms').hidden = state.rankScope !== 'tagli';
    });
  }

  document.addEventListener('keydown', (e) => {
    if (currentView() !== 'vota') return;
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); vote('left'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); vote('right'); }
    else if (e.key === ' ') { e.preventDefault(); skip(); }
  });

  window.addEventListener('hashchange', () => showView(currentView()));
}

/* ------------------------------------------------------------------ avvio */

async function main() {
  wireControls();
  showView(currentView());

  state.store = await createStore();

  try {
    state.stats = await state.store.loadPairStats();
  } catch (err) {
    console.error(err);
    state.stats = [];
  }

  recompute();
  nextChallenge();

  if (state.store.mode === 'local') {
    showBanner(
      state.store.reason === 'non configurato'
        ? 'Backend non configurato: i voti restano in questo browser e la classifica è solo tua.'
        : 'Backend non raggiungibile: i voti restano in questo browser finché il collegamento non torna.'
    );
  }

  if (currentView() === 'classifica') renderRankings();
}

main();
