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
import { imageAspect, isPortrait } from './image-aspects.js';

import {
  LANGUAGES,
  DEFAULT_LANG,
  detectLang,
  saveLang,
  translate,
} from './i18n.js';

import { computeRankings, pickPair } from './rating.js';
import { isConfigured as appCheckOn, warmUp as warmUpAppCheck } from './app-check.js';

import {
  createStore,
  loadSeenPairs,
  markPairSeen,
  myVoteCount,
  bumpMyVoteCount,
} from './store.js';

const PAGE_SIZE = 20;

const PAIRS = allPairs();
const DESIGN_IDS = DESIGNS.map((d) => d.id);

const state = {
  store: null,
  stats: [],          // [{denomination, designLo, designHi, winsLo, winsHi}]
  rankings: null,
  rankScope: 'banconote',  // 'banconote' | 'disegni'
  // Quante righe della classifica per banconota sono state disegnate finora. Le
  // 60 banconote formano una pagina alta sedici metri: se ne mostrano venti alla
  // volta, che stanno in due o tre schermate e si scorrono senza perdersi.
  visibleRows: PAGE_SIZE,
  current: null,      // sfida in corso
  lang: DEFAULT_LANG,
  theme: 'auto',      // 'auto' | 'light' | 'dark'
  // Chiave del messaggio in fascia, non il testo già tradotto: cambiando
  // lingua va riscritto, e senza la chiave non si saprebbe in cosa.
  bannerKey: null,
  // Quando la classifica mostrata è l'ultima copia salvata invece di quella
  // appena letta: serve a non spacciarla per aggiornata.
  staleSince: null,
  seen: loadSeenPairs(),
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
    const attiva = link.dataset.view === name;
    link.classList.toggle('is-active', attiva);
    // Il colore della pillola dice dove si è solo a chi lo vede.
    if (attiva) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (name === 'classifica') renderRankings();
  if (name === 'design') renderDesignGallery();
  window.scrollTo(0, 0);

  // Il contenuto cambia senza che la pagina si ricarichi: spostando il fuoco
  // sulla sezione, uno screen reader riparte da lì e legge la nuova
  // intestazione. Senza, resta ad annunciare la vista precedente.
  // preventScroll perché la posizione l'ha già decisa la riga sopra.
  $(`view-${name}`).focus({ preventScroll: true });
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
    // Le proposte verticali mettono fronte e retro affiancati: impilate
    // occuperebbero due schermate e non si vedrebbero le due carte insieme.
    $(`card-${pos}`)
      .querySelector('.note-sides')
      .classList.toggle('is-portrait', isPortrait(id));
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
    // Il nome del bottone veniva dalla somma dei due alt: ripeteva due volte
    // "Disegno B, banconota da 200 euro" e non diceva che serve a votare.
    $(`card-${pos}`).setAttribute(
      'aria-label',
      t('vote.cardLabel', { letter: design.letter, denom: denomination })
    );
  }

  // Dopo un voto le immagini cambiano ma il fuoco non si muove: senza questo
  // annuncio, chi non vede non ha modo di sapere che la sfida è un'altra.
  $('challenge-live').textContent = t('a11y.newChallenge', {
    a: DESIGNS_BY_ID[left].letter,
    b: DESIGNS_BY_ID[right].letter,
    denom: denomination,
  });

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
  const key =
    mine === 0 ? 'vote.countZero' : mine === 1 ? 'vote.countOne' : 'vote.countMany';
  $('vote-count').textContent = t(key, { n: mine });
}

/**
 * Registra il voto e passa subito alla sfida successiva.
 *
 * L'invio al server non viene atteso: l'aggiornamento locale è già stato fatto
 * e far aspettare la rete a ogni voto renderebbe lento chi vota in fretta. Se
 * la scrittura fallisce si torna indietro e lo si dice, anche se nel frattempo
 * sono comparse altre banconote.
 */
function vote(position) {
  if (!state.current) return;

  const { denomination, left, right, key } = state.current;
  const winner = position === 'left' ? left : right;
  const loser = position === 'left' ? right : left;

  applyVoteLocally(denomination, winner, loser);
  recompute();
  bumpMyVoteCount();
  state.seen.add(key);
  markPairSeen(key);

  state.store.submitVote({ denomination, winner, loser }).catch((err) => {
    console.error(err);
    undoVoteLocally(denomination, winner, loser);
    recompute();
    showBanner('banner.voteFailed');
  });

  nextChallenge();
}

function skip() {
  if (!state.current) return;
  state.seen.add(state.current.key);
  markPairSeen(state.current.key);
  nextChallenge();
}

function showBanner(key) {
  state.bannerKey = key;
  const el = $('mode-banner');
  el.textContent = t(key);
  el.hidden = false;
}

/* ---------------------------------------------------------- classifiche */

function themeTag(design) {
  const theme = THEMES[design.theme];
  return `<span class="tag ${theme.id}">${t(theme.labelKey)}</span>`;
}

/**
 * Le due facce di una banconota, con proporzioni note per non far saltare il
 * layout mentre le immagini arrivano.
 */
function notePair(designId, denomination, letter) {
  return SIDES.map(
    (side) => `<img src="${imageUrl(designId, denomination, side)}"
       style="aspect-ratio:${imageAspect(designId, denomination, side)}"
       alt="${t('alt.note', { letter, denom: denomination, side: t(`side.${side}`) })}"
       loading="lazy">`
  ).join('');
}

/**
 * Una riga di classifica: posizione, disegno, punteggio e la banconota.
 *
 * Nient'altro. Designer, tema e record di vittorie erano rumore in una lista
 * che serve a rispondere a una domanda sola — chi sta davanti e a cosa somiglia
 * — e li si trova comunque nella scheda del disegno.
 *
 * @param {object} entry              riga con elo, rank, designId, denomination
 * @param {number|null} denomination  taglio da mostrare; null = disegno intero
 */
function rankRow(entry, denomination) {
  const design = DESIGNS_BY_ID[entry.designId];

  // Per un disegno intero non c'è un taglio solo da mostrare: si mostrano tutti
  // e sei, che è poi ciò di cui il punteggio è la media.
  // Si mostra sempre la banconota intera, fronte e retro: e' quello che si vota.
  const notes =
    denomination == null
      ? DENOMINATIONS.map((d) => notePair(entry.designId, d, design.letter)).join('')
      : notePair(entry.designId, denomination, design.letter);

  return `
    <li class="rank-row ${entry.rank === 1 ? 'is-first' : ''}">
      <div class="rank-pos">${entry.rank}</div>
      <div class="rank-name">${
        denomination == null
          ? t('rank.proposal', { letter: design.letter })
          : t('rank.proposalDenom', { letter: design.letter, denom: denomination })
      }</div>
      <div class="rank-elo">${Math.round(entry.elo)}</div>
      <div class="rank-note ${denomination == null ? 'is-family' : ''}">${notes}</div>
    </li>`;
}

/**
 * Le 60 banconote (10 disegni × 6 tagli) in un'unica graduatoria.
 *
 * Il punteggio di ciascuna resta quello calcolato dentro il proprio taglio: non
 * esiste alcun voto che confronti un 5 € con un 200 €, quindi il modello non ha
 * modo di collegarli. Le forze sono comunque ancorate alla stessa scala —
 * l'avversario virtuale della regolarizzazione vale 1 in ogni taglio — e questo
 * rende i numeri accostabili: dicono quanto una banconota svetta sul campo del
 * suo taglio.
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

  // Tre casi, non due: condivisa e aggiornata, condivisa ma vecchia, oppure
  // soltanto i propri voti. Dire "solo i tuoi voti" davanti a una copia della
  // classifica vera sarebbe falso quanto il contrario.
  const mode = t(
    isShared()
      ? 'rank.modeShared'
      : state.staleSince != null
        ? 'rank.modeStale'
        : 'rank.modeLocal'
  );

  $('rank-summary').textContent =
    totalVotes === 0
      ? t('rank.summaryNone', { mode })
      : t('rank.summarySome', { n: totalVotes.toLocaleString(state.lang), mode });

  // Per banconota: si disegnano solo le righe già richieste.
  const all = allNotesRanking();
  const shown = Math.min(state.visibleRows, all.length);
  $('ranking-notes-list').innerHTML = all
    .slice(0, shown)
    .map((r) => rankRow(r, r.denomination))
    .join('');

  const more = $('btn-more');
  const remaining = all.length - shown;
  more.hidden = remaining === 0;
  if (remaining > 0) {
    more.textContent = t('rank.showMore', { n: Math.min(PAGE_SIZE, remaining) });
  }

  // Per disegno
  $('ranking-designs-list').innerHTML = families.map((f) => rankRow(f, null)).join('');
}

/* ------------------------------------------------------------- i design */

/**
 * La galleria si ridisegna a ogni cambio di lingua: i testi vengono dalla BCE
 * e cambiano tutti, quindi non basta tradurre le etichette.
 */
function renderDesignGallery() {
  $('design-grid').innerHTML = DESIGNS.map((d) => {
    const text = designText(d.id);
    // Tutte e sei le banconote, fronte e retro, in cima alla scheda: prima
    // c'era il solo 50 € ingrandito, che di una proposta mostrava un dodicesimo.
    const notes = DENOMINATIONS.map((den) => notePair(d.id, den, d.letter)).join('');

    return `
      <article class="design-card">
        <div class="design-notes ${isPortrait(d.id) ? 'is-portrait' : ''}">${notes}</div>
        <div class="design-body">
          <h2>${t('rank.proposal', { letter: d.letter })}${themeTag(d)}</h2>
          <p class="who">${text.designer}</p>
          <p class="desc">${text.description}</p>
        </div>
      </article>`;
  }).join('');
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
    setSegState(b, b.dataset.value === state.theme);
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
  // Etichette che solo un lettore di schermo sente. Restavano in italiano in
  // tutte e cinque le lingue perché scritte a mano nell'HTML: non si vedono,
  // quindi nessuna schermata le avrebbe mai denunciate.
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
  $('method-body').innerHTML = t('method.bodyHtml');

  for (const b of $('lang-buttons').querySelectorAll('.seg-btn')) {
    setSegState(b, b.dataset.value === state.lang);
  }

  // Il testo generato dal codice non ha attributi da rileggere: va rifatto.
  if (state.bannerKey) showBanner(state.bannerKey);
  if (state.current) renderArena();
  if (state.rankings) renderRankings();
  renderDesignGallery();
  updateVoteCount();
}

/**
 * Stato di un bottone segmentato.
 *
 * La classe da sola colora e basta: uno screen reader leggeva cinque bottoni
 * di lingua identici, senza modo di sapere quale fosse attiva. `aria-pressed`
 * lo dice, ed è anche il gancio su cui il foglio di stile disegna un contorno,
 * perché la differenza fra i due sfondi è 1,2:1 — invisibile a chi ha poca
 * sensibilità al contrasto.
 */
function setSegState(button, active) {
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', String(active));
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

/** Mostra il livello di classifica scelto: per banconota o per disegno. */
function showRankScope() {
  $('rank-notes').hidden = state.rankScope !== 'banconote';
  $('rank-designs').hidden = state.rankScope !== 'disegni';
}

function wireControls() {
  $('card-left').addEventListener('click', () => vote('left'));
  $('card-right').addEventListener('click', () => vote('right'));
  $('btn-skip').addEventListener('click', skip);

  $('btn-more').addEventListener('click', () => {
    state.visibleRows += PAGE_SIZE;
    renderRankings();
  });

  // Solo le schede della classifica, non ogni elemento con la classe .seg-btn:
  // tema e lingua nel footer usano lo stesso stile, e con un selettore generico
  // finivano per far girare anche questo codice. Cambiando lingua, `data-scope`
  // era indefinito, nessun contenitore corrispondeva e la classifica spariva.
  const scopeButtons = document.querySelectorAll('.seg-btn[data-scope]');
  // Lo stato iniziale è nell'HTML come sola classe: senza questo giro, i due
  // bottoni restano senza aria-pressed finché non li si clicca, e chi apre la
  // classifica non sa quale delle due sia mostrata.
  for (const btn of scopeButtons) {
    setSegState(btn, btn.dataset.scope === state.rankScope);
  }
  for (const btn of scopeButtons) {
    btn.addEventListener('click', () => {
      state.rankScope = btn.dataset.scope;
      // Cambiando scheda si riparte dall'alto: chi cambia vista vuole rivedere
      // la testa della classifica, non riprendere da dov'era.
      state.visibleRows = PAGE_SIZE;
      renderRankings();
      for (const b of scopeButtons) {
        setSegState(b, b === btn);
      }
      showRankScope();
    });
  }

  // Scorciatoie da tastiera, ma solo quando nessun controllo ha il fuoco.
  //
  // Il filtro escludeva soltanto input/textarea/select, e questo rompeva due
  // cose per chi naviga da tastiera. Con il fuoco su una carta, spazio è
  // l'attivatore nativo di un <button>: il preventDefault lo annullava e al
  // suo posto saltava la coppia, quindi si credeva di votare e invece si
  // scartava. E con il fuoco ovunque nel piè di pagina, le frecce — che sono
  // il modo naturale di muoversi fra bottoni e i tasti di lettura degli
  // screen reader — votavano una banconota fuori schermo.
  document.addEventListener('keydown', (e) => {
    if (currentView() !== 'vota') return;
    if (e.target.closest('a, button, input, textarea, select')) return;
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

  // Le condizioni d'uso di reCAPTCHA chiedono di dichiararlo quando il badge
  // e' nascosto. La nota compare solo se App Check e' davvero configurato:
  // senza, il sito non carica niente da Google e non ha niente da dichiarare.
  if (appCheckOn()) {
    $('recaptcha-note').hidden = false;
    // Il token si scalda ora, cosi' la prima lettura non paga il caricamento.
    warmUpAppCheck();
  }

  wireControls();
  showView(currentView());

  // Una sola lettura, non due: createStore restituisce le statistiche che ha
  // già scaricato per capire se il backend risponde. Chiederle di nuovo qui
  // raddoppiava il costo di ogni visita, ed è ciò che ha esaurito la quota
  // gratuita di Firestore lasciando tutti senza classifica condivisa.
  const { store, stats, staleSince } = await createStore();
  state.store = store;
  state.stats = stats;
  state.staleSince = staleSince;

  recompute();
  nextChallenge();

  if (state.store.mode === 'local') {
    showBanner(
      staleSince != null
        ? 'banner.stale'
        : state.store.reason === 'non configurato'
          ? 'banner.notConfigured'
          : 'banner.unreachable'
    );
  }

  if (currentView() === 'classifica') renderRankings();
}

main();
