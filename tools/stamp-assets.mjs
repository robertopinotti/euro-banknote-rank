/**
 * Marca ogni file servito con l'impronta del suo contenuto.
 *
 * Perché serve. GitHub Pages serve ogni file con `cache-control: max-age=600`,
 * e HTML, CSS e JavaScript scadono ciascuno per conto proprio. Nei dieci minuti
 * dopo una pubblicazione un browser può quindi ritrovarsi con l'HTML nuovo e il
 * CSS — o un modulo — ancora vecchio. È già successo due volte: una pagina
 * senza regole di stile, e un footer che mostrava `footer.creditHtml` perché
 * `i18n.js` era la copia vecchia, priva di quella chiave.
 *
 * `?v=<impronta>` risolve alla radice: se il contenuto cambia cambia l'URL,
 * quindi il browser non ha nulla in cache da riusare; se non cambia, l'URL resta
 * identico e la cache continua a valere.
 *
 * I moduli importati sono il punto delicato. `import './i18n.js'` si risolve
 * relativamente a chi importa e scarta la query, quindi marcare `app.js` non
 * basta: i suoi moduli restavano senza versione. Si genera allora un import map
 * che rimappa ogni modulo alla propria versione. È l'unico modo per farlo senza
 * riscrivere gli import nei sorgenti, cioè senza introdurre un passo di
 * compilazione in un progetto che ne è volutamente privo.
 *
 * Questo script non serve a costruire il sito: il sito funziona anche senza
 * eseguirlo mai. Allinea solo le impronte, e la CI lo esegue prima di
 * pubblicare perché nessuno debba ricordarsene.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = resolve(ROOT, 'index.html');
const ENTRY = 'src/app.js';

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

// --- CSS e script di ingresso, referenziati direttamente dall'HTML ---------
// La regex accetta un `?v=` già presente, così lo script è idempotente e si può
// rieseguire senza accumulare code.
html = html.replace(
  /((?:href|src)=")((?:assets|src)\/[^"?]+)(\?v=[^"]*)?(")/g,
  (_m, before, path, _old, after) => {
    const hash = fingerprint(path);
    stamped.push(`${path} -> ${hash}`);
    return `${before}${path}?v=${hash}${after}`;
  }
);

// --- moduli importati da app.js -------------------------------------------
// Le chiavi dell'import map si risolvono rispetto all'HTML, gli specificatori
// dentro i moduli rispetto a chi importa: entrambi finiscono sullo stesso URL
// `<base>/src/<nome>.js`, quindi la corrispondenza vale.
const modules = readdirSync(resolve(ROOT, 'src'))
  .filter((f) => f.endsWith('.js') && `src/${f}` !== ENTRY)
  .sort();

const imports = Object.fromEntries(
  modules.map((f) => {
    const hash = fingerprint(`src/${f}`);
    stamped.push(`src/${f} -> ${hash}`);
    return [`./src/${f}`, `./src/${f}?v=${hash}`];
  })
);

// config.js sta nella radice ed è importato da store.js.
const configHash = fingerprint('config.js');
imports['./config.js'] = `./config.js?v=${configHash}`;
stamped.push(`config.js -> ${configHash}`);

const importMap =
  '<script type="importmap">\n' +
  JSON.stringify({ imports }, null, 2) +
  '\n</script>';

// L'import map deve precedere lo script che la usa.
const MAP_RE = /<script type="importmap">[\s\S]*?<\/script>\n?/;
if (MAP_RE.test(html)) {
  html = html.replace(MAP_RE, `${importMap}\n`);
} else {
  html = html.replace(
    /(<script type="module")/,
    `${importMap}\n$1`
  );
}

writeFileSync(HTML, html);

console.log(`index.html: ${stamped.length} riferimenti marcati`);
for (const line of stamped) console.log(`  ${line}`);
