# Banconota d'Europa

*[English version](README.md)*

Sito di voto sulle dieci proposte di design per le future banconote in euro.
Si vota a coppie — due banconote **dello stesso taglio**, una contro l'altra — e
la classifica si ricava dai confronti con il modello **Bradley–Terry**.

Sito statico: nessun processo di build, nessuna dipendenza a runtime.

🔗 **[robertopinotti.github.io/euro-banknote-rank](https://robertopinotti.github.io/euro-banknote-rank/)**

---

## Come funziona

**Perché lo stesso taglio.** Confrontare un 5 € con un 200 € non ha senso: sono
disegni pensati per ruoli diversi. Si confrontano quindi solo banconote pari
grado, e dalle sei classifiche per taglio si ricava per aggregazione la
classifica dei dieci disegni completi.

**Da 270 confronti a una classifica.** Con 10 disegni e 6 tagli le coppie
possibili sono 45 per taglio, 270 in tutto. A ogni disegno si associa una
*forza* `p` e si assume `P(i batte j) = p_i / (p_i + p_j)`. Le forze si stimano
con l'algoritmo MM di Hunter. Rispetto alla percentuale di vittorie il modello
pesa la qualità dell'avversario — battere il primo vale più che battere
l'ultimo — e non dipende dall'ordine in cui arrivano i voti.

Il punteggio mostrato è la forza sulla scala Elo,
`R = 1500 + (400/ln 10) · ln p`: 100 punti di distacco valgono circa il 64% di
probabilità di vittoria, 400 punti valgono 10 a 1.

La classifica ha due livelli: **per banconota** (tutte e 60) e **per disegno**
(i 10 disegni, ciascuno con la media dei suoi sei tagli). Spiegazione estesa
nella pagina **Metodo** del sito.

---

## Avviare in locale

I moduli ES non si caricano da `file://`: serve un server statico qualsiasi.

```bash
python3 -m http.server 8000   # poi apri http://localhost:8000
```

Senza backend configurato il sito funziona lo stesso: i voti restano nel
`localStorage` e la classifica è personale.

## Test

```bash
npm test                      # 9 test del motore di classifica, nessuna dipendenza
npm install && npm run test:rules   # 25 test contro l'emulatore Firestore (serve Java)
```

I test delle regole sono in due gruppi. Diciassette colpiscono le regole con l'SDK
Firebase — scrivere un punteggio arbitrario, incrementare di 1000, togliere voti
agli altri, cancellare — e devono fallire tutti. Gli altri otto fanno girare il
codice vero di `src/store.js` contro l'emulatore, perché le regole sono scritte
pensando all'SDK mentre il sito parla REST con `updateMask` e `updateTransforms`.
Fra questi c'è il caso che conta di più: venti voti simultanei sulla stessa
coppia devono dare venti voti contati, non uno perso.

---

## Classifica condivisa (Firebase)

Senza backend ogni visitatore vede solo i propri voti. Per una classifica
collettiva serve Firestore:

1. Crea un progetto su [console.firebase.google.com](https://console.firebase.google.com)
   e, al suo interno, un **database Firestore** (modalità produzione).
2. Registra un'**app Web** (Impostazioni progetto → Le tue app → `</>`). Dei
   valori mostrati servono solo `projectId` e `apiKey`.
3. Pubblica le regole di [`firebase/firestore.rules`](firebase/firestore.rules),
   dalla console (Firestore → Regole) oppure con
   `npx firebase deploy --only firestore:rules`.

   **Non saltare questo passaggio.** Le regole predefinite sono "nega tutto" (il
   sito non funziona) oppure "consenti tutto" per 30 giorni (chiunque può
   cancellare la classifica).
4. Scrivi `projectId` e `apiKey` in [`config.js`](config.js).

Il piano gratuito **Spark** basta: si usano solo Firestore e le sue regole,
niente Cloud Functions. Un voto è una scrittura; caricare la classifica costa
una lettura per coppia già votata (al massimo 270).

### Come sono protetti i dati

La chiave Firebase è pubblica per definizione: sta nel codice di un sito statico
e non protegge niente. A proteggere i dati sono le regole, che impongono che una
scrittura possa solo aggiungere 1 a un contatore, che l'id del documento
corrisponda alla coppia, che taglio e disegno esistano, e che niente si possa
cancellare. **Non mettere mai in `config.js` una chiave di servizio o le
credenziali dell'Admin SDK:** scavalcherebbero ogni regola.

| operazione | consentita |
| --- | --- |
| leggere la classifica | sì |
| aggiungere 1 a un contatore | sì |
| scrivere un punteggio arbitrario | no |
| togliere voti | no |
| cancellare dati | no |

Resta una cosa che le regole non possono fare: impedire a uno script di inviare
molti voti legittimi da +1. Se diventasse un problema, la risposta è
[App Check](https://firebase.google.com/docs/app-check) con reCAPTCHA,
disponibile sul piano gratuito.

Se il backend è configurato ma irraggiungibile il sito ripiega sulla modalità
locale e lo dichiara, invece di mostrare una pagina rotta.

---

## Pubblicare

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) esegue i test e
pubblica su GitHub Pages a ogni push. Non c'è build: si pubblica il repository
così com'è.

Prima di pubblicare gira [`tools/stamp-assets.mjs`](tools/stamp-assets.mjs), che
aggiunge a CSS e script un `?v=` derivato dal contenuto. GitHub Pages serve ogni
file con dieci minuti di cache indipendenti: senza marcatura, nei minuti dopo una
pubblicazione un browser può ritrovarsi l'HTML nuovo e il CSS vecchio. Marcare
l'HTML non basta per i moduli — `import './i18n.js'` si risolve rispetto a chi
importa e scarta la query — quindi lo script genera anche un
`<script type="importmap">` che rimappa ogni modulo alla sua versione. In locale
si allinea con `npm run stamp`, ma non è necessario: ci pensa la CI.

Perché l'attivazione automatica di Pages funzioni il repository deve essere
pubblico, oppure privato con piano **GitHub Pro o Team**. Altrimenti fallisce con
un errore che sembra di permessi (`Resource not accessible by integration`) ma è
di disponibilità.

Va bene anche qualunque altro hosting statico.

---

## Struttura

```
index.html                     le quattro viste (vota, classifica, disegni, metodo)
config.js                      progetto Firebase e chiave pubblica
src/data.js                    i 10 disegni, i 6 tagli, i percorsi delle immagini
src/rating.js                  Bradley–Terry, scala Elo, scelta delle coppie
src/store.js                   accesso ai dati: Firestore o localStorage
src/app.js                     interfaccia e instradamento
src/i18n.js                    testi dell'interfaccia in it/en/fr/de/es
src/design-texts.js            testi BCE dei disegni nelle 5 lingue (generato)
src/image-aspects.js           proporzioni delle 120 immagini (generato)
assets/css/style.css           foglio di stile unico, chiaro e scuro
assets/banknotes/              120 immagini WebP (60 fronti + 60 retri)
tools/stamp-assets.mjs         impronte anti-cache e import map
firebase/firestore.rules       regole di sicurezza Firestore
test/                          motore di classifica, regole ed adattatore Firestore
```

Le dipendenze in `package.json` servono solo a eseguire i test delle regole
Firestore: il sito non ne ha nessuna.

**Tre disegni su dieci — D, I e J — sono verticali**, ma la BCE pubblica quasi
tutti i loro file in orizzontale, con il contenuto ruotato di 90°. Le immagini
nel repository sono già raddrizzate. Il criterio non è a occhio: la bandiera
europea è sempre 3:2, quindi se in un'immagine risulta più alta che larga il file
è ruotato. L'unica eccezione già verticale è il fronte del 200 € del disegno D.

Le immagini sono ridimensionate a 1000 px sul lato lungo e convertite in WebP:
8,8 MB invece dei 41 MB degli originali, perché una schermata di voto ne carica
quattro alla volta. Gli originali restano sul sito della BCE.

Il sito è in **italiano, inglese, francese, tedesco e spagnolo**. Le descrizioni
dei disegni non sono tradotte da noi: sono quelle ufficiali della BCE, prese
dalle rispettive versioni linguistiche della sua pagina, così ai designer non
vengono attribuite parole che non hanno scritto.

---

## I dieci disegni

Cinque sul tema **cultura europea**, cinque sul tema **fiumi e uccelli**.

| | Designer | Tema |
| --- | --- | --- |
| A | Studio Joost Grootens | cultura europea |
| B | PunktFormStrich | fiumi e uccelli |
| C | Neue Gestaltung GmbH | cultura europea |
| D | Rudy Guedj e François Girard-Meunier | fiumi e uccelli |
| E | Myrsini Vardopoulou | cultura europea |
| F | Jan Robert Dünnweller | cultura europea |
| G | Rubio & del Amo e Cruz más Cruz | cultura europea |
| H | Atelier Goppel-Toperngpong | fiumi e uccelli |
| I | Isabelle Daëron | fiumi e uccelli |
| J | Ville Tietäväinen | fiumi e uccelli |

Ogni disegno copre tutti e sei i tagli (5, 10, 20, 50, 100, 200 €), fronte e
retro: 120 immagini in tutto.

---

## Limiti da tenere presenti

- Il campione è chi capita sul sito: **non è un sondaggio rappresentativo** della
  popolazione europea e non va presentato come tale.
- L'identificativo del votante sta nel browser: si può aggirare.
- Si vota la banconota intera: fronte e retro sono mostrati insieme.

---

## Immagini e attribuzione

Le immagini sono **proposte di design** per una possibile futura serie di
banconote in euro, non banconote definitive.

Fonte: Banca centrale europea —
[Future euro banknote design proposals](https://www.ecb.europa.eu/euro/banknotes/future_banknotes/html/design-proposals.en.html).

La BCE ne consente l'uso a fini **informativi, editoriali e di cronaca**. Non
sono ammessi usi commerciali, promozionali o di merchandising, né alterazioni o
presentazioni ingannevoli, né usi che lascino intendere un'approvazione della BCE
o dell'Eurosistema, senza autorizzazione scritta preventiva. Le immagini vanno
sempre identificate come proposte di design, citando la BCE come fonte.

Questo progetto è indipendente, non ha alcun rapporto con la BCE e non influisce
sulla scelta ufficiale del design.

Il codice è dei rispettivi autori; le immagini restano soggette alle condizioni
d'uso della BCE sopra riportate.
