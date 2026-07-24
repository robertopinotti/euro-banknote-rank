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
  culture: {
    id: 'culture',
    label: 'Cultura europea',
    short: 'Cultura',
    color: '#b8860b',
  },
  nature: {
    id: 'nature',
    label: 'Fiumi e uccelli',
    short: 'Fiumi e uccelli',
    color: '#2e7d6f',
  },
};

/** URL della pagina BCE da cui proviene ogni immagine, per l'originale ad alta risoluzione. */
const ECB_IMG_BASE =
  'https://www.ecb.europa.eu/euro/banknotes/future_banknotes/shared/img';

/**
 * I dieci design in concorso (A–J). `id` è la lettera minuscola usata anche
 * nei nomi dei file immagine e come chiave nel database dei voti.
 */
export const DESIGNS = [
  {
    id: 'a',
    letter: 'A',
    designer: 'Studio Joost Grootens',
    theme: 'culture',
    description:
      'Una riflessione su come si forma la cultura. Gli occhi rappresentano l\'osservare e il percepire, la bocca l\'espressione e il dialogo: i ritratti superano l\'identità individuale per arrivare a una capacità umana condivisa. Sul retro, spazi culturali contemporanei con persone di età e provenienze diverse che si incontrano.',
  },
  {
    id: 'b',
    letter: 'B',
    designer: 'PunktFormStrich',
    theme: 'nature',
    description:
      'Ogni banconota presenta una specie di uccello in relazione al suo habitat. Strutture a barre orizzontali traducono in forma visiva il canto di ciascun uccello, mentre una scala verticale ne indica la velocità di volo. Sul retro, edifici dell\'UE e la mappa d\'Europa collegano ambiente naturale e identità culturale condivisa.',
  },
  {
    id: 'c',
    letter: 'C',
    designer: 'Neue Gestaltung GmbH',
    theme: 'culture',
    description:
      'Europa come spazio culturale condiviso. Ogni banconota è riconoscibile dal colore dominante e da un motivo centrale, e ritrae una personalità che unisce gli europei attraverso i secoli. Sul retro una mappa d\'Europa con le costellazioni che hanno guidato i viaggiatori, accanto a una scena attuale dello spazio culturale rappresentato.',
  },
  {
    id: 'd',
    letter: 'D',
    designer: 'Rudy Guedj e François Girard-Meunier',
    theme: 'nature',
    description:
      'Sei uccelli in paesaggi astratti, collegati dal viaggio continuo di un fiume, dalla sorgente di montagna al mare in tempesta. Le scene invitano a un\'osservazione ravvicinata, mettendo chi guarda nei panni di un birdwatcher. Sul retro le istituzioni UE sono espresse attraverso gesti umani e una trama simile a un tessuto.',
  },
  {
    id: 'e',
    letter: 'E',
    designer: 'Myrsini Vardopoulou',
    theme: 'culture',
    description:
      'L\'attenzione è sul valore universale del lavoro di ciascuno più che sulla personalità. Il cerchio e i simboli funzionano come messaggio visivo che indica uno spazio intellettuale, immediatamente familiare ma ricco di dettagli simbolici per una lettura più profonda: nonostante la diversità delle persone, il loro contributo è una fonte unitaria di ispirazione.',
  },
  {
    id: 'f',
    letter: 'F',
    designer: 'Jan Robert Dünnweller',
    theme: 'culture',
    description:
      'Illustra il motto ufficiale dell\'UE, "Unita nella diversità". L\'Europa è unita da una storia culturale condivisa, rappresentata dai ritratti di figure europee iconiche, e dalla diversità delle identità culturali. Questa diversità è resa con un collage di forme e texture che insieme creano un nuovo insieme, sfondo per i ritratti disegnati a mano.',
  },
  {
    id: 'g',
    letter: 'G',
    designer: 'Rubio & del Amo e Cruz más Cruz',
    theme: 'culture',
    description:
      'Uno sguardo coinvolgente incontra chi osserva dal centro della banconota: un dialogo tra chi ha forgiato la nostra identità culturale e chi oggi rende l\'Europa un luogo all\'avanguardia del pensiero. Ruotando le banconote in orizzontale si vedono quattro blocchi verticali, ispirati alle lettere "E", "U", "R" e "O".',
  },
  {
    id: 'h',
    letter: 'H',
    designer: 'Atelier Goppel-Toperngpong',
    theme: 'nature',
    description:
      'L\'acqua scorre: è il fondamento della vita e plasma gli habitat della ricca avifauna europea raffigurata sulle banconote. Le sue qualità — equilibrio, costanza — diventano analogie delle istituzioni UE. Una goccia sembra trascurabile, ma nei secoli un torrente scolpisce le montagne: così milioni di persone unite da un obiettivo comune.',
  },
  {
    id: 'i',
    letter: 'I',
    designer: 'Isabelle Daëron',
    theme: 'nature',
    description:
      'Dal battito d\'ala di un uccello al corso dei fiumi, il movimento è al centro della proposta. L\'uccello — solo sul fronte, in gruppo sul retro — simboleggia il dialogo e l\'interdipendenza tra le nostre società e la natura. Il volo rivela il paesaggio attraverso l\'intreccio di due trame: una disegnata a pennarello, l\'altra vettoriale.',
  },
  {
    id: 'j',
    letter: 'J',
    designer: 'Ville Tietäväinen',
    theme: 'nature',
    description:
      'Una storia visiva dei fiumi europei, dalle sorgenti di montagna fino al mare. I protagonisti sono gli uccelli europei nei loro habitat naturali: più alto è il taglio, più l\'immagine si avvicina al mare. Anche gli edifici UE sul retro si fondono con le ali degli uccelli raffigurati sul fronte.',
  },
];

export const DESIGNS_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d]));

/** Percorso locale (ottimizzato) dell'immagine di una banconota. */
export function imageUrl(designId, denomination, side = 'front') {
  return `assets/banknotes/banknote-design-proposal-${designId}-${denomination}-${side}.webp`;
}

/** URL dell'originale ad alta risoluzione sul sito della BCE. */
export function ecbImageUrl(designId, denomination, side = 'front') {
  return `${ECB_IMG_BASE}/banknote-design-proposal-${designId}-${denomination}-${side}.jpg`;
}

/** Solo il taglio da 5 € ha anche l'immagine del retro. */
export function hasBack(denomination) {
  return denomination === 5;
}

/** Identificativo stabile di una banconota, es. "c-50". */
export function noteId(designId, denomination) {
  return `${designId}-${denomination}`;
}

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

/** Chiave canonica di una coppia, indipendente dall'ordine di presentazione. */
export function pairKey(denomination, designA, designB) {
  const [lo, hi] = designA < designB ? [designA, designB] : [designB, designA];
  return `${denomination}|${lo}|${hi}`;
}
