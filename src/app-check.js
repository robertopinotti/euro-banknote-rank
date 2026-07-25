/**
 * App Check: evidence that a request came from this site and not from a script.
 *
 * The security rules can prove a vote is *well formed* — one counter, plus one,
 * a real pair. What they cannot see is who sent it. A loop of `curl` calls
 * produces requests the rules are obliged to accept, one after another, and
 * nothing in Firestore distinguishes them from a person clicking. App Check is
 * the piece that does: the browser solves a reCAPTCHA challenge, exchanges the
 * result for a short-lived token, and sends that token with every request.
 *
 * Done without the Firebase SDK, on purpose. The site has no runtime
 * dependencies and no build step, and the SDK would have brought both. The
 * REST API is enough: one POST to exchange the token, and one header on the
 * Firestore calls. The endpoint and the field names come from the official
 * discovery document, not from memory.
 *
 * It fails open. If reCAPTCHA does not load, or the exchange fails, requests go
 * out without a token rather than not at all. While App Check is in monitoring
 * mode that is exactly right — nothing breaks and the console shows what a real
 * rollout would have rejected. Under enforcement those requests are refused by
 * Firestore, and the site already knows how to say so: a failed read shows the
 * last shared ranking, a failed vote says the vote was not recorded. Failing
 * closed here would mean an outage at Google takes the site down twice over.
 */

import { FIREBASE, APP_CHECK } from '../config.js';

/** Header Firestore reads the token from. */
const HEADER = 'X-Firebase-AppCheck';

/** Refresh at 80% of the token's life, so a vote never races the expiry. */
const REFRESH_AT = 0.8;

/**
 * How long to wait for reCAPTCHA before giving up and going without a token.
 * The first read happens while the page is still opening: a third party being
 * slow must not hold the ranking hostage.
 */
const TIMEOUT_MS = 5000;

let cached = null;      // { token, expiresAt }
let inFlight = null;    // una richiesta alla volta, non una per chiamante
let complained = false; // un solo messaggio in console, non uno per voto

/** True when config.js carries both values; otherwise this module does nothing. */
export function isConfigured() {
  return Boolean(APP_CHECK.siteKey && APP_CHECK.appId);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('scaduto')), ms)),
  ]);
}

/** Loads Google's reCAPTCHA script once, and resolves when it is ready. */
function loadRecaptcha() {
  if (window.grecaptcha?.execute) return Promise.resolve(window.grecaptcha);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-recaptcha]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(APP_CHECK.siteKey)}`;
      s.async = true;
      s.dataset.recaptcha = '';
      s.onerror = () => reject(new Error('reCAPTCHA non caricato'));
      document.head.appendChild(s);
    }
    // grecaptcha.ready fires once the library has finished initialising; the
    // script's onload is too early to call execute().
    const attesa = setInterval(() => {
      if (window.grecaptcha?.ready) {
        clearInterval(attesa);
        window.grecaptcha.ready(() => resolve(window.grecaptcha));
      }
    }, 50);
  });
}

/**
 * reCAPTCHA token -> App Check token.
 *
 * POST v1/projects/{projectId}/apps/{appId}:exchangeRecaptchaV3Token
 * body   { "recaptchaV3Token": "..." }
 * answer { "token": "...", "ttl": "3600s" }
 */
async function exchange(recaptchaToken) {
  // L'appId va nel percorso con i due punti come sono. Codificarli in %3A
  // sembra piu' prudente e invece rompe: la richiesta viene instradata
  // altrove e torna un errore diverso, mentre in chiaro raggiunge l'API.
  // Non si codifica ma si controlla la forma, che e' l'unico modo di essere
  // sicuri che non finisca nel percorso qualcosa che non dovrebbe.
  if (!/^[0-9]+:[0-9]+:web:[0-9a-f]+$/i.test(APP_CHECK.appId)) {
    throw new Error(`appId non valido in config.js: ${APP_CHECK.appId}`);
  }

  const url =
    `https://firebaseappcheck.googleapis.com/v1/projects/${FIREBASE.projectId}` +
    `/apps/${APP_CHECK.appId}:exchangeRecaptchaV3Token` +
    `?key=${encodeURIComponent(FIREBASE.apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recaptchaV3Token: recaptchaToken }),
  });

  if (!res.ok) {
    throw new Error(`scambio del token fallito (HTTP ${res.status}): ${await res.text()}`);
  }

  const body = await res.json();
  // Il ttl arriva come "3600s". Se manca o è illeggibile si tiene un'ora, che
  // è il valore predefinito di App Check.
  const seconds = Number(String(body.ttl || '3600s').replace(/s$/, '')) || 3600;
  return { token: body.token, expiresAt: Date.now() + seconds * 1000 * REFRESH_AT };
}

async function currentToken() {
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const grecaptcha = await loadRecaptcha();
    const recaptchaToken = await grecaptcha.execute(APP_CHECK.siteKey, { action: 'firestore' });
    cached = await exchange(recaptchaToken);
    return cached.token;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Headers to add to a Firestore request. Empty when App Check is not
 * configured, or when getting a token did not work out.
 */
export async function appCheckHeaders() {
  if (!isConfigured()) return {};
  try {
    return { [HEADER]: await withTimeout(currentToken(), TIMEOUT_MS) };
  } catch (err) {
    if (!complained) {
      complained = true;
      console.warn('App Check non disponibile, si procede senza token.', err);
    }
    return {};
  }
}

/**
 * Starts fetching a token without waiting for it.
 *
 * Called as the page opens so that the first read does not pay for loading
 * reCAPTCHA. Nothing depends on the result: appCheckHeaders() will find the
 * token cached, or ask again.
 */
export function warmUp() {
  if (isConfigured()) currentToken().catch(() => {});
}
