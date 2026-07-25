/**
 * Marca CSS e script in index.html con l'impronta del loro contenuto.
 *
 * Perché serve. GitHub Pages serve ogni file con `cache-control: max-age=600`,
 * e HTML, CSS e JavaScript scadono ciascuno per conto proprio. Nei dieci minuti
 * dopo una pubblicazione un browser può quindi ritrovarsi con l'HTML nuovo e il
 * CSS ancora vecchio. Finché i due cambiano insieme — come quando è sparito il
 * riquadro attorno alle banconote, che ha spostato le regole da `.note-figure
 * img` a `.note-sides img` — la pagina risulta rotta: le immagini perdono ogni
 * regola di dimensione e tornano ai loro 1000 px, sfondando il layout.
 *
 * Aggiungere `?v=<impronta>` risolve alla radice: se il contenuto cambia cambia
 * l'URL, quindi il browser non ha nulla in cache da riusare e lo scarica.
 * Se il contenuto non cambia l'URL resta identico e la cache continua a valere.
 *
 * Questo non è un passo di compilazione: il sito si serve così com'è anche
 * senza mai eseguire questo script. Serve solo a tenere allineate le impronte,
 * e la CI lo esegue prima di pubblicare perché nessuno debba ricordarsene.
 *
 * Limite noto: i moduli che `app.js` importa non ereditano l'impronta, perché
 * `import './data.js'` si risolve senza la query dell'importatore. Se cambia un
 * solo modulo senza che cambi `app.js`, per dieci minuti un browser può usarne
 * la versione vecchia. È un rischio molto minore di quello risolto qui — un
 * modulo disallineato di solito solleva un errore invece di produrre una pagina
 * apparentemente rotta — e chiuderlo richiederebbe di riscrivere gli import,
 * cioè di introdurre davvero un passo di compilazione.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = resolve(ROOT, 'index.html');

/**
 * Impronta breve del contenuto di un file. Otto caratteri esadecimali: la
 * probabilità di collisione su una manciata di file è trascurabile, e l'URL
 * resta leggibile.
 */
function fingerprint(relativePath) {
  const bytes = readFileSync(resolve(ROOT, relativePath));
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

let html = readFileSync(HTML, 'utf8');
const stamped = [];

// Riscrive `href`/`src` che puntano a un file locale, con o senza `?v=` già
// presente, così lo script è idempotente e si può rieseguire quante volte si
// vuole senza accumulare code.
html = html.replace(
  /((?:href|src)=")((?:assets|src)\/[^"?]+)(\?v=[^"]*)?(")/g,
  (_match, before, path, _oldQuery, after) => {
    const hash = fingerprint(path);
    stamped.push(`${path} -> ${hash}`);
    return `${before}${path}?v=${hash}${after}`;
  }
);

writeFileSync(HTML, html);

console.log(`index.html: ${stamped.length} riferimenti marcati`);
for (const line of stamped) console.log(`  ${line}`);
