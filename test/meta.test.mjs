/**
 * The share card: the tags in index.html against the strings in i18n.js.
 *
 * These two say the same thing in two places, which is the shape of bug this
 * repository has already collected: the tags are static because crawlers do not
 * run JavaScript, and the strings are what a visitor reads. Nothing keeps them
 * together except this file.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { STRINGS } from '../src/i18n.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

const SITE = 'https://robertopinotti.github.io/euro-banknote-rank/';

/** The content of <meta property="…"> or <meta name="…">, decoded. */
function meta(key) {
  const attr = key.startsWith('og:') ? 'property' : 'name';
  const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  return m && m[1]
    .replaceAll('&amp;', '&').replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>').replaceAll('&quot;', '"');
}

test('og:title and og:description are the English strings, verbatim', () => {
  assert.equal(meta('og:title'), STRINGS.en['meta.title']);
  assert.equal(meta('og:description'), STRINGS.en['meta.description']);
});

test('the visible title and description match them too', () => {
  // The head is monolingual on purpose: a scraper that ignores og:title falls
  // back to <title>, and the two must not disagree.
  assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], STRINGS.en['meta.title']);
  assert.equal(meta('description'), STRINGS.en['meta.description']);
});

test('the shared URLs are absolute', () => {
  // WhatsApp does not resolve relative URLs, and it is the channel the share
  // button feeds: a relative og:image means no picture at all.
  assert.equal(meta('og:url'), SITE);
  assert.equal(meta('og:image'), `${SITE}assets/og-cover.jpg`);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}"`));
});

test('the cover exists and is the size the tags declare', () => {
  const bytes = readFileSync(resolve(ROOT, 'assets/og-cover.jpg'));
  const { width, height } = jpegSize(bytes);
  assert.equal(String(width), meta('og:image:width'));
  assert.equal(String(height), meta('og:image:height'));
  // WhatsApp downloads the preview on the sender's device with a tight ceiling;
  // above it the card degrades to text only.
  assert.ok(bytes.length < 300_000, `og-cover.jpg is ${bytes.length} bytes`);
});

/**
 * Width and height of a JPEG, by walking the markers to the frame header.
 * Same spirit as webpSize() in tools/measure-images.mjs: reading eight bytes is
 * cheaper than a dependency.
 */
function jpegSize(buf) {
  let i = 2; // skip SOI
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error('not a JPEG marker');
    const marker = buf[i + 1];
    // SOF0..SOF15, minus the four that are not frame headers.
    if (marker >= 0xc0 && marker <= 0xcf
        && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no frame header found');
}
