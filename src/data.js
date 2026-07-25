/**
 * Dati dei design proposti per le future banconote in euro.
 *
 * Fonte: Banca centrale europea — "Future euro banknote design proposals"
 * https://www.ecb.europa.eu/euro/banknotes/future_banknotes/html/design-proposals.en.html
 *
 * Le immagini sono proposte di design, non banconote definitive.
 */

export const DENOMINATIONS = [5, 10, 20, 50, 100, 200];

export const THEMES = {
  culture: { id: 'culture', labelKey: 'themeName.culture', color: '#b8860b' },
  nature: { id: 'nature', labelKey: 'themeName.nature', color: '#2e7d6f' },
};

/**
 * I dieci design in concorso (A–J). `id` è la lettera minuscola usata anche
 * nei nomi dei file immagine e come chiave nel database dei voti.
 *
 * Nome del designer e descrizione non stanno qui: sono testo tradotto e vivono
 * in `design-texts.js`, che raccoglie le versioni ufficiali della BCE nelle
 * quattro lingue del sito.
 */
export const DESIGNS = [
  { id: 'a', letter: 'A', theme: 'culture' },
  { id: 'b', letter: 'B', theme: 'nature' },
  { id: 'c', letter: 'C', theme: 'culture' },
  { id: 'd', letter: 'D', theme: 'nature' },
  { id: 'e', letter: 'E', theme: 'culture' },
  { id: 'f', letter: 'F', theme: 'culture' },
  { id: 'g', letter: 'G', theme: 'culture' },
  { id: 'h', letter: 'H', theme: 'nature' },
  { id: 'i', letter: 'I', theme: 'nature' },
  { id: 'j', letter: 'J', theme: 'nature' },
];

export const DESIGNS_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d]));

/** Percorso locale (ottimizzato) dell'immagine di una banconota. */
export function imageUrl(designId, denomination, side = 'front') {
  return `assets/banknotes/banknote-design-proposal-${designId}-${denomination}-${side}.webp`;
}

/**
 * Ogni banconota ha fronte e retro. La pagina della BCE mostra il retro solo
 * per il 5 €, ma i file pubblicati coprono tutti e sei i tagli: il repository
 * li contiene tutti e 120.
 */
export const SIDES = ['front', 'back'];

/**
 * Tutte le coppie non ordinate di design, con la lettera minore per prima.
 * Con 10 design sono 45 coppie per ciascuno dei 6 tagli: 270 confronti possibili.
 */
export function allPairs() {
  const ids = DESIGNS.map((d) => d.id);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  return pairs;
}
