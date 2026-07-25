# Banknote of Europe

A voting site for the ten design proposals for the future euro banknotes. You
vote in pairs — two banknotes **of the same denomination**, head to head — and
the ranking is derived from those comparisons with the **Bradley–Terry** model.

Static site: no build step, no runtime dependencies.

🔗 **[robertopinotti.github.io/euro-banknote-rank](https://robertopinotti.github.io/euro-banknote-rank/)**

---

## How it works

**Why same-denomination.** Comparing a €5 with a €200 makes no sense: they are
designed for different roles. So only equals compete, and the ranking of the ten
complete designs is derived by aggregating the six per-denomination rankings.

**From 270 comparisons to a ranking.** With 10 designs and 6 denominations there
are 45 possible pairs per denomination, 270 in total. Each design gets a
*strength* `p`, and `P(i beats j) = p_i / (p_i + p_j)`. Strengths are estimated
with Hunter's MM algorithm. Compared with a plain win percentage, the model
weighs the quality of the opponent — beating the leader counts for more than
beating the last — and does not depend on the order votes arrive in.

The displayed score is that strength on the Elo scale,
`R = 1500 + (400/ln 10) · ln p`: a 100-point gap means roughly a 64% chance of
winning, 400 points mean 10 to 1.

The ranking has two levels: **by banknote** (all 60) and **by design** (the 10
designs, each averaging its six denominations). Full explanation on the
**Method** page of the site.

---

## Running locally

ES modules will not load from `file://`, so any static server will do.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

With no backend configured the site still works: votes stay in `localStorage`
and the ranking is your own.

## Tests

```bash
npm test                            # 9 rating-engine tests, no dependencies
npm install && npm run test:rules   # 37 tests against the Firestore emulator (needs Java)
```

The rules tests come in two groups. Twenty-three attack the rules through the
Firebase SDK — writing an arbitrary score, incrementing by 1000, taking votes
away from others, declaring one counter while inflating another, deleting — and
all of them must fail. The other fourteen run the real `src/store.js` code
against the emulator, because the rules are written with the SDK in mind while
the site speaks REST with `updateMask` and `updateTransforms`. Among those is
the case that matters most: twenty simultaneous votes on the same pair must
yield twenty counted votes, not one lost.

---

## Shared ranking (Firebase)

Without a backend every visitor sees only their own votes. A collective ranking
needs Firestore:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   and a **Firestore database** inside it (production mode).
2. Register a **Web app** (Project settings → Your apps → `</>`). Of the values
   shown you only need `projectId` and `apiKey`.
3. Publish the rules in [`firebase/firestore.rules`](firebase/firestore.rules),
   from the console (Firestore → Rules) or with
   `npx firebase deploy --only firestore:rules`.

   **Do not skip this step.** Firestore's defaults are either "deny everything"
   (the site won't work) or "allow everything" for 30 days (anyone can wipe the
   ranking).
4. Put `projectId` and `apiKey` in [`config.js`](config.js).

The free **Spark** plan is enough: only Firestore and its rules are used, no
Cloud Functions. One vote is one write, and loading the ranking is one read.

That last part was learned the hard way. The counters started out as 270
documents, one per pair, so opening the site cost 270 reads — and the free tier
allows 50,000 a day. The ranking went dark one morning after fewer than a
hundred visits. All 540 counters now live in a single document, `stats/all`,
which puts the ceiling somewhere around 50,000 visits a day instead of 185.

### How the data is protected

The Firebase key is public by design: it sits in the code of a static site and
protects nothing. The rules are what protect the data. They require that a write
can only add 1 to one counter, that the counter is one of the 540 real ones, and
that nothing can be created or deleted. **Never put a service key or Admin SDK
credentials in `config.js`:** they would bypass every rule.

With one document per pair the rules could name the field being written. With a
single document they cannot, so each write declares which counter it is touching
in a `last` field and the rules check that claim against the data — including
that the counter named is the only one that moved, which is what stops a write
from declaring something harmless and inflating something else. The mechanism
that makes this possible is dynamic indexing inside the rules, `c[last]`; the
tests prove it works rather than take it on faith.

| operation | allowed |
| --- | --- |
| read the ranking | yes |
| add 1 to one counter | yes |
| add 1 to two counters at once | no |
| write an arbitrary score | no |
| take votes away | no |
| invent a counter name | no |
| create or delete the document | no |

One thing the rules cannot do is stop a script from sending many legitimate +1
votes. If that became a problem, the answer is
[App Check](https://firebase.google.com/docs/app-check) with reCAPTCHA, available
on the free plan.

If the backend is configured but unreachable, the site falls back to local mode
and says so, rather than showing a broken page.

### Seeding the ranking document

`stats/all` is created once, by hand, and the rules forbid creating it from the
browser — a create rule would be a way to overwrite the whole ranking with one
write. [`tools/seed-aggregate.mjs`](tools/seed-aggregate.mjs) writes it, carrying
across whatever votes the old per-pair collection already held:

1. In the Firebase console, publish the rules with `allow create: if true` on
   `stats/all` instead of `if false`.
2. `npm run seed`
3. Publish [`firebase/firestore.rules`](firebase/firestore.rules) as it stands
   here, so `allow create` goes back to `false`.

Step 3 is not optional: between 1 and 3 anybody who knows the project could
replace the document. The script prints the totals it wrote, so you can check
that what ends up in the database is what came out of the old collection.

---

## Publishing

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs the tests and
publishes to GitHub Pages on every push. There is no build: the repository is
published as it is.

Before publishing it runs [`tools/stamp-assets.mjs`](tools/stamp-assets.mjs),
which appends a content-derived `?v=` to CSS and scripts. GitHub Pages serves
every file with its own ten-minute cache, so without that stamp a browser can end
up with the new HTML and the old CSS in the minutes after a deploy. Stamping the
HTML is not enough for modules — `import './i18n.js'` resolves against the
importer and drops the query — so the script also generates a
`<script type="importmap">` remapping every module to its versioned URL. Locally
you can align them with `npm run stamp`, but you don't have to: CI does it.

For Pages to enable itself the repository must be public, or private on a
**GitHub Pro or Team** plan. Otherwise enablement fails with an error that looks
like permissions (`Resource not accessible by integration`) but is really about
availability.

Any other static host works just as well.

---

## Layout

```
index.html                     the four views (vote, ranking, designs, method)
config.js                      Firebase project and public key
src/data.js                    the 10 designs, the 6 denominations, image paths
src/rating.js                  Bradley–Terry, Elo scale, pair selection
src/store.js                   data access: Firestore or localStorage
src/app.js                     interface and routing
src/i18n.js                    interface text in it/en/fr/de/es
src/design-texts.js            ECB design texts in 5 languages (generated)
src/image-aspects.js           aspect ratios of the 120 images (generated)
assets/css/style.css           single stylesheet, light and dark
assets/banknotes/              120 WebP images (60 fronts + 60 reverses)
tools/stamp-assets.mjs         cache-busting fingerprints and import map
tools/seed-aggregate.mjs       one-off migration to the single-document schema
firebase/firestore.rules       Firestore security rules
test/                          rating engine, rules, and the Firestore adapter
```

The dependencies in `package.json` exist only to run the Firestore rules tests;
the site itself has none.

**Three of the ten designs — D, I and J — are portrait**, but the ECB publishes
almost all of their files in landscape, with the content rotated 90°. The images
in this repository are already upright. The test is not by eye: the European flag
is always 3:2, so if it measures taller than wide in an image, the file is
rotated. The only file already published upright is the €200 front of design D.

Images are resized to 1000 px on the long side and converted to WebP: 8.8 MB
instead of the originals' 41 MB, because one voting screen loads four at a time.
The originals stay on the ECB's site.

The site is available in **Italian, English, French, German and Spanish**. The
design descriptions are not our translations: they are the ECB's official ones,
taken from the corresponding language versions of its page, so that designers are
not credited with words they did not write.

---

## The ten designs

Five on the theme **European culture**, five on **rivers and birds**.

| | Designer | Theme |
| --- | --- | --- |
| A | Studio Joost Grootens | European culture |
| B | PunktFormStrich | rivers and birds |
| C | Neue Gestaltung GmbH | European culture |
| D | Rudy Guedj and François Girard-Meunier | rivers and birds |
| E | Myrsini Vardopoulou | European culture |
| F | Jan Robert Dünnweller | European culture |
| G | Rubio & del Amo and Cruz más Cruz | European culture |
| H | Atelier Goppel-Toperngpong | rivers and birds |
| I | Isabelle Daëron | rivers and birds |
| J | Ville Tietäväinen | rivers and birds |

Each design covers all six denominations (€5, 10, 20, 50, 100, 200), front and
reverse: 120 images in total.

---

## Limits worth stating

- The sample is whoever happens to visit: **this is not a representative
  survey** of the European population and must not be presented as one.
- The voter id lives in the browser: it can be worked around.
- You vote on the whole banknote: front and reverse are shown together.

---

## Images and attribution

The images are **design proposals** for a possible future series of euro
banknotes, not final banknotes.

Source: European Central Bank —
[Future euro banknote design proposals](https://www.ecb.europa.eu/euro/banknotes/future_banknotes/html/design-proposals.en.html).

The ECB permits their use for **information, editorial and news** purposes.
Commercial, promotional or merchandising use is not allowed, nor is alteration or
misleading presentation, nor any use implying ECB or Eurosystem endorsement,
without prior written permission. The images must always be identified as design
proposals, citing the ECB as the source.

This project is independent, has no relationship with the ECB, and has no bearing
on the official choice of design.

The code belongs to its respective authors; the images remain subject to the
ECB's terms of use above.
