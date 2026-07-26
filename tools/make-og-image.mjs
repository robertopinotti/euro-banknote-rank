/**
 * Builds assets/og-cover.jpg, the picture that appears when the link is shared,
 * by screenshotting tools/og-cover.html at 1200x630.
 *
 * Why it is generated once and committed rather than produced on request: the
 * site is static, served straight off GitHub Pages, and there is nothing
 * running that could compose an image. Same arrangement as
 * tools/measure-images.mjs and src/image-aspects.js.
 *
 * Why a screenshot and not an image library: the source pictures are WebP, and
 * decoding WebP needs a decoder. The browser already has one, is already in the
 * toolchain, and writes JPEG itself — so there is no second step and nothing to
 * add to package.json.
 *
 * Why JPEG and not one of the 120 WebP files we already have: the crawlers that
 * matter — WhatsApp above all — handle WebP badly or not at all as an og:image,
 * and a preview that silently fails to render is the whole problem this fixes.
 *
 * Playwright is deliberately NOT in devDependencies: CI runs `npm ci` on every
 * deploy and this script runs about once a year. Run it with a temporary copy:
 *
 *   npm i --no-save playwright && node tools/make-og-image.mjs
 *
 * A global install works too: the script looks there by itself, because
 * NODE_PATH — the usual way of pointing Node at a global package — is ignored
 * by ES modules and only works for require().
 *
 * Two limits worth keeping in mind before changing the composition:
 *
 * - Under 300 KB. WhatsApp downloads the preview on the sender's device with a
 *   tight ceiling; above it the card degrades to text only, which is where we
 *   started. The script refuses to write a file over that size.
 * - Facebook and WhatsApp cache a scrape by URL for days. If the cover ever
 *   changes, rename the file (og-cover-2.jpg) instead of overwriting it —
 *   otherwise everyone who has already shared the link keeps the old picture.
 */

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'tools/og-cover.html');
const OUTPUT = resolve(ROOT, 'assets/og-cover.jpg');

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 300_000;

/** Playwright from the project if it is there, otherwise from the global root. */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch { /* not installed here; try the global root below */ }
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return await import(pathToFileURL(join(root, 'playwright', 'index.mjs')).href);
  } catch { /* nor there */ }
  console.error(
    'playwright not found. See the header of this file: it is deliberately not\n' +
    'a dependency of the project. Try:\n' +
    '  npm i --no-save playwright && node tools/make-og-image.mjs'
  );
  process.exit(1);
}

const { chromium } = await loadPlaywright();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  // A screenshot at 1x: the card is displayed around 500px wide at most, and
  // twice the pixels would only cost weight against the 300 KB ceiling.
  deviceScaleFactor: 1,
});

await page.goto(pathToFileURL(SOURCE).href);
// The banknotes are local files, but the decode still happens after load.
await page.evaluate(() => Promise.all(
  [...document.images].map((img) => img.decode().catch(() => {}))
));

// quality 82 is where the flat background and the fine engraving of the notes
// still hold up; 90 costs a third more bytes for no visible difference.
await page.screenshot({ path: OUTPUT, type: 'jpeg', quality: 82 });
await browser.close();

const bytes = statSync(OUTPUT).size;
console.log(`assets/og-cover.jpg  ${WIDTH}x${HEIGHT}  ${(bytes / 1024).toFixed(0)} KB`);
if (bytes > MAX_BYTES) {
  console.error(`too heavy: ${bytes} bytes, over the ${MAX_BYTES} WhatsApp shows.`);
  process.exit(1);
}
