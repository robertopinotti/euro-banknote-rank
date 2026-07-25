/**
 * Controller dell'interfaccia: instradamento fra le viste, gestione della
 * sfida a due, rendering delle classifiche.
 */

import {
  DESIGNS,
  DESIGNS_BY_ID,
  DENOMINATIONS,
  THEMES,
  SIDES,
  imageUrl,
  allPairs,
} from './data.js';

import { DESIGN_TEXTS } from './design-texts.js';
import { imageAspect } from './image-aspects.js';

import {
  LANGUAGES,
  DEFAULT_LANG,
  detectLang,
  saveLang,
  translate,
} from './i18n.js';

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
  rankScope: 'generale',   // 'generale' | 'famiglie' | 'tagli'
  current: null,      // sfida in corso
  lang: DEFAULT_LANG,
  theme: 'auto',      // 'auto' | 'light' | 'dark'
  seen: loadSeenPairs(),
  busy: false,
};

const $ = (id) => document.getElementById(id);

/** Testo tradotto nella lingua corrente. */
const t = (key, vars) => translate(state.lang, key, vars);

/** Testi BCE del design nella lingua corrente. */
const designText = (id) =>
  (DESIGN_TEXTS[state.lang] || DESIGN_TEXTS[DEFAULT_LANG])[id];

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
  renderArena();
  preloadNext(denom);
}

function renderArena() {
  const { denomination, left, right } = state.current;

  for (const [pos, id] of [['left', left], ['right', right]]) {
    const design = DESIGNS_BY_ID[id];
    // Fronte e retro insieme: si vota la banconota intera, non una sua faccia.
    for (const side of SIDES) {
      const img = $(`img-${pos}-${side}`);
      img.classList.add('is-loading');
      img.onload = () => img.classList.remove('is-loading');
      // Le proporzioni vere prima della sorgente: così l'altezza è nota subito
      // e la carta non collassa nell'attesa che l'immagine arrivi.
      img.style.aspectRatio = String(imageAspect(id, denomination, side));
      img.src = imageUrl(id, denomination, side);
      img.alt = t('alt.note', {
        letter: design.letter,
        denom: denomination,
        side: t(`side.${side}`),
      });
    }
    $(`letter-${pos}`).textContent = t('rank.proposal', { letter: design.letter });
    $(`designer-${pos}`).textContent = designText(id).designer;
    $(`card-${pos}`).classList.remove('is-chosen');
  }

  $('arena').classList.remove('is-voting');
  updateVoteCount();
}

/** Scalda la cache del browser con le immagini della sfida successiva. */
function preloadNext(denom) {
  const guess = pickPair(PAIRS, pairCountMap(), strengthMapFor(denom), denom, state.seen);
  for (const id of guess.pair) {
    for (const side of SIDES) {
      const img = new Image();
      img.src = imageUrl(id, denom, side);
    }
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
  // Solo i voti di chi sta votando. Il totale generale stava qui accanto, ma
  // era una mezza verità: veniva letto all'apertura della pagina e non si
  // riallineava, quindi dopo qualche voto mostrava un numero vecchio. Il totale
  // aggiornato si trova nella classifica, che è il posto dove si va a
  // guardare i numeri.
  const mine = myVoteCount();
  $('vote-count').textContent =
    mine === 1 ? t('vote.countOne') : t('vote.countMany', { n: mine });
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
    showBanner(t('banner.voteFailed'));
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
  const theme = THEMES[design.theme];
  return `<span class="tag ${theme.id}">${t(theme.labelKey)}</span>`;
}

/**
 * Una riga di classifica.
 *
 * @param {object} entry              riga con elo, eloError, wins, played, rank
 * @param {number|null} denomination  taglio della miniatura; null = famiglia intera
 * @param {number} maxElo
 * @param {number} minElo
 * @param {boolean} [showDenomination] mostra il taglio accanto alla proposta:
 *   serve nella classifica generale, dove convivono banconote di tagli diversi
 *   e la sola lettera non basta a capire di quale si tratta.
 */
function rankRow(entry, denomination, maxElo, minElo, showDenomination = false) {
  const design = DESIGNS_BY_ID[entry.designId];
  const span = Math.max(1, maxElo - minElo);
  // La barra parte dall'8% invece che da zero: l'ultimo in classifica resta
  // comunque visibile, e il confronto fra le lunghezze resta leggibile.
  const pct = 8 + ((entry.elo - minElo) / span) * 92;
  const thumbDenom = denomination ?? 50;

  const record =
    entry.played === 0
      ? t('rank.recordNone')
      : t(entry.wins === 1 ? 'rank.recordOne' : 'rank.recordMany', {
          w: entry.wins,
          n: entry.played,
          p: Math.round(entry.winRate * 100),
        });

  const denomLabel = showDenomination
    ? `<span class="rank-denom">${entry.denomination} €</span>`
    : '';

  return `
    <li class="rank-row ${entry.rank === 1 ? 'is-first' : ''}">
      <div class="rank-pos">${entry.rank}</div>
      <div class="rank-thumb">
        <img src="${imageUrl(entry.designId, thumbDenom)}" alt="" loading="lazy">
      </div>
      <div class="rank-info">
        <div class="rank-name">${t('rank.proposal', { letter: design.letter })}${denomLabel}${themeTag(design)}</div>
        <div class="rank-designer">${designText(entry.designId).designer}</div>
      </div>
      <div class="rank-score">
        <span class="rank-elo">${Math.round(entry.elo)}</span>
        <span class="rank-err">± ${Math.round(entry.eloError)}</span>
        <span class="rank-record">${record}</span>
      </div>
      <div class="rank-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
    </li>`;
}

/**
 * Le 60 banconote (10 proposte × 6 tagli) in un'unica graduatoria.
 *
 * Il punteggio di ciascuna resta quello calcolato dentro il proprio taglio: non
 * esiste alcun voto che confronti un 5 € con un 200 €, quindi il modello non ha
 * modo di collegarli. Le forze sono comunque ancorate alla stessa scala —
 * l'avversario virtuale della regolarizzazione vale 1 in ogni taglio — e questo
 * rende i numeri accostabili: dicono quanto una banconota svetta sul campo del
 * suo taglio. Metterle in fila ha senso a patto di leggerle così, ed è quello
 * che la nota in cima alla vista spiega a chi guarda.
 */
function allNotesRanking() {
  const rows = [];
  for (const denom of DENOMINATIONS) {
    for (const r of state.rankings.byDenomination.get(denom)) {
      // Copia: la posizione qui è un'altra cosa rispetto a quella dentro il
      // taglio, e sovrascriverla romperebbe la classifica per taglio.
      rows.push({ ...r });
    }
  }
  rows.sort((a, b) => b.strength - a.strength);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

function renderRankings() {
  if (!state.rankings) return;

  const { families, totalVotes } = state.rankings;

  const mode = t(isShared() ? 'rank.modeShared' : 'rank.modeLocal');

  $('rank-summary').textContent =
    totalVotes === 0
      ? t('rank.summaryNone', { mode })
      : t('rank.summarySome', { n: totalVotes.toLocaleString(state.lang), mode });

  // Generale: tutte e 60 le banconote
  const all = allNotesRanking();
  const allElos = all.map((r) => r.elo);
  $('ranking-all-list').innerHTML = all
    .map((r) => rankRow(r, r.denomination, Math.max(...allElos), Math.min(...allElos), true))
    .join('');

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

/**
 * La galleria si ridisegna a ogni cambio di lingua: i testi vengono dalla BCE
 * e cambiano tutti, quindi non basta tradurre le etichette.
 */
function renderDesignGallery() {
  $('design-grid').innerHTML = DESIGNS.map((d) => {
    const text = designText(d.id);
    const strip = DENOMINATIONS.map(
      (den) =>
        `<img src="${imageUrl(d.id, den)}" alt="${t('alt.note', {
          letter: d.letter,
          denom: den,
          side: t('side.front'),
        })}" loading="lazy">`
    ).join('');

    return `
      <article class="design-card">
        <figure>
          <img src="${imageUrl(d.id, 50)}" alt="${t('alt.note', {
            letter: d.letter,
            denom: 50,
            side: t('side.front'),
          })}" loading="lazy">
        </figure>
        <figure>
          <img src="${imageUrl(d.id, 50, 'back')}" alt="${t('alt.note', {
            letter: d.letter,
            denom: 50,
            side: t('side.back'),
          })}" loading="lazy">
        </figure>
        <div class="design-body">
          <h3>${t('rank.proposal', { letter: d.letter })}${themeTag(d)}</h3>
          <p class="who">${text.designer}</p>
          <p class="desc">${text.description}</p>
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

/* ------------------------------------------------------- tema e lingua */

const THEME_KEY = 'ebr:theme';
const THEME_MODES = ['auto', 'light', 'dark'];

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (THEME_MODES.includes(saved)) return saved;
  } catch {
    // storage non disponibile: si resta su 'auto'
  }
  return 'auto';
}

/**
 * In 'auto' l'attributo viene tolto del tutto, così comanda la media query sul
 * tema di sistema. Con una scelta esplicita l'attributo la sovrascrive, in
 * entrambe le direzioni: serve anche `data-theme="light"` per chi ha il sistema
 * scuro ma vuole il sito chiaro.
 */
function applyTheme() {
  const root = document.documentElement;
  if (state.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = state.theme;

  try {
    localStorage.setItem(THEME_KEY, state.theme);
  } catch {
    // senza storage la scelta vale solo per questa visita
  }

  for (const b of $('theme-buttons').querySelectorAll('.seg-btn')) {
    b.classList.toggle('is-active', b.dataset.value === state.theme);
  }
}

/** Riscrive tutti i testi statici e ridisegna quelli generati dal codice. */
function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.title = t('meta.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('meta.description'));

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  // Chiavi con marcatura: il contenuto è nostro, non arriva da chi visita.
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    el.innerHTML = t(el.dataset.i18nHtml);
  }
  $('method-body').innerHTML = t('method.bodyHtml');

  for (const b of $('lang-buttons').querySelectorAll('.seg-btn')) {
    b.classList.toggle('is-active', b.dataset.value === state.lang);
  }

  // Il testo generato dal codice non ha attributi da rileggere: va rifatto.
  if (state.current) renderArena();
  if (state.rankings) renderRankings();
  renderDesignGallery();
  updateVoteCount();
}

function buildSegButtons(container, options, onPick) {
  container.innerHTML = options
    .map((o) => `<button type="button" class="seg-btn" data-value="${o.value}">${o.label}</button>`)
    .join('');
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (btn) onPick(btn.dataset.value);
  });
}

/** Mostra il livello di classifica scelto: generale, per design o per taglio. */
function showRankScope() {
  $('rank-generale').hidden = state.rankScope !== 'generale';
  $('rank-families').hidden = state.rankScope !== 'famiglie';
  $('rank-denoms').hidden = state.rankScope !== 'tagli';
}

function wireControls() {
  $('card-left').addEventListener('click', () => vote('left'));
  $('card-right').addEventListener('click', () => vote('right'));
  $('btn-skip').addEventListener('click', skip);

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
      showRankScope();
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
  state.lang = detectLang();
  state.theme = loadTheme();

  buildSegButtons(
    $('theme-buttons'),
    THEME_MODES.map((m) => ({ value: m, label: t(`theme.${m}`) })),
    (value) => {
      state.theme = value;
      applyTheme();
    }
  );

  buildSegButtons(
    $('lang-buttons'),
    LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
    (value) => {
      state.lang = value;
      saveLang(value);
      // Le etichette del tema sono tradotte: vanno riscritte con le altre.
      for (const b of $('theme-buttons').querySelectorAll('.seg-btn')) {
        b.textContent = t(`theme.${b.dataset.value}`);
      }
      applyLanguage();
    }
  );

  applyTheme();
  applyLanguage();

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
      t(state.store.reason === 'non configurato'
        ? 'banner.notConfigured'
        : 'banner.unreachable')
    );
  }

  if (currentView() === 'classifica') renderRankings();
}

main();
