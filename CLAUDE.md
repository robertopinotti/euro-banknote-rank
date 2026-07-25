# CLAUDE.md

Note per chi lavora su questo repository con Claude Code.

## Cos'è

Sito statico di voto a coppie sulle dieci proposte di design per le future
banconote in euro, con classifica calcolata via Bradley–Terry. Vedi
[README.md](README.md) (o [README.en.md](README.en.md)) per il quadro completo.

## Vincolo principale: niente build

Il sito è HTML + CSS + moduli ES serviti così come sono. **Non introdurre un
bundler, un transpiler o dipendenze a runtime.** Le dipendenze in `package.json`
esistono solo per i test delle regole Firestore e non finiscono mai nella pagina.

Conseguenze pratiche:

- Niente JSX, TypeScript, import da CDN, `npm run build`.
- Il codice deve girare nel browser così com'è scritto.
- Se serve generare qualcosa (testi, proporzioni delle immagini), lo si genera
  una volta con uno script e si versiona il risultato.

## Comandi

```bash
python3 -m http.server 8000   # servire il sito in locale
npm test                      # 9 test del motore di classifica
npm run test:rules            # 25 test contro l'emulatore Firestore (serve Java)
npm run stamp                 # riallinea le impronte anti-cache in index.html
```

## Mappa dei file

| file | cosa contiene |
| --- | --- |
| `index.html` | le quattro viste; ogni testo visibile è una chiave `data-i18n` |
| `src/app.js` | controller: instradamento, sfida a due, rendering delle classifiche |
| `src/rating.js` | Bradley–Terry (MM di Hunter), scala Elo, scelta delle coppie |
| `src/store.js` | Firestore via REST, oppure `localStorage` |
| `src/data.js` | i 10 disegni, i 6 tagli, i percorsi delle immagini |
| `src/i18n.js` | tutti i testi dell'interfaccia in it/en/fr/de/es |
| `config.js` | progetto Firebase e chiave pubblica |
| `tools/stamp-assets.mjs` | impronte `?v=` e import map |

**File generati, da non modificare a mano:** `src/design-texts.js` (testi
ufficiali BCE) e `src/image-aspects.js` (proporzioni delle 120 immagini). Se il
contenuto va cambiato, si rigenera.

## Convenzioni

**Lingua.** Commenti, messaggi di commit e documentazione sono in italiano;
identificatori e chiavi in inglese. Il README ha una versione inglese di pari
contenuto: se cambia uno, cambia anche l'altro.

**Commenti.** Spiegano *perché*, non *cosa*. Diversi commenti registrano un
errore già commesso e la ragione della forma attuale: non toglierli riscrivendo
il codice attorno, valgono più della riga che descrivono.

**i18n.** Ogni testo visibile passa da `src/i18n.js`. Le chiavi con suffisso
`Html` contengono marcatura e vengono inserite con `innerHTML`; tutte le altre
sono testo semplice inserito con `textContent`. La distinzione è nel nome
apposta: confonderle è il modo classico di aprire un buco XSS.

Aggiungendo una chiave, aggiungila in **tutte e cinque** le lingue. Controllo
rapido:

```bash
node -e "import('./src/i18n.js').then(({STRINGS,LANGUAGES})=>{
  const k=Object.keys(STRINGS.it);
  for(const l of LANGUAGES.map(x=>x.code))
    console.log(l, k.filter(x=>!(x in STRINGS[l])));
})"
```

I testi dei disegni non sono traduzioni nostre: sono quelle ufficiali della BCE.
Non riscriverli.

**Cache.** Ogni file servito porta un `?v=` derivato dal contenuto, e i moduli
importati sono coperti da un import map generato da `tools/stamp-assets.mjs`.
Se aggiungi un file in `src/`, lo script lo prende da solo — ma va rieseguito
(`npm run stamp`), altrimenti ci pensa la CI al deploy.

**CSS.** Un foglio solo. I token del tema sono duplicati sotto tre selettori
(`prefers-color-scheme` per l'automatico, `[data-theme="dark"]` e
`[data-theme="light"]` per la scelta esplicita), perché la scelta manuale deve
vincere in entrambe le direzioni.

## Trappole già incontrate

- **Sostituzioni di blocco che mangiano codice adiacente.** È successo due volte
  (una funzione persa, tre costanti di `localStorage` perse). Dopo una modifica
  ampia, ricarica la pagina in un browser vero: i test unitari non se ne
  accorgono.
- **Contare i nodi nel DOM non dice se si vedono.** Un bug in cui la classifica
  spariva è passato indenne perché le righe c'erano — era il contenitore a
  essere nascosto. Misura l'altezza renderizzata.
- **Le immagini della BCE non sono tutte orientate come il disegno.** Tre
  disegni (D, I, J) sono verticali ma pubblicati ruotati. Il criterio oggettivo è
  la bandiera europea, sempre 3:2.

## Verifica prima di consegnare

1. `npm test`
2. Apri il sito in un browser vero: vota, guarda entrambe le classifiche, cambia
   lingua e tema, apri la galleria dei disegni e la pagina Metodo.
3. Controlla la console: zero errori.
4. `npm run stamp` se hai toccato CSS o JavaScript.
