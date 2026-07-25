# Banconota d'Europa

Sito di voto sulle dieci proposte di design per le future banconote in euro.
Si vota a coppie — due banconote **dello stesso taglio**, una contro l'altra — e
la classifica si ricava dai confronti con il modello **Bradley–Terry**.

Sito statico, nessun processo di build, nessuna dipendenza da installare.

---

## Come funziona

**Perché lo stesso taglio.** Confrontare un 5 € con un 200 € non ha senso: sono
disegni pensati per ruoli diversi, con colori e formati diversi. Si confrontano
quindi solo banconote pari grado, e dalle sei classifiche per taglio si ricava
per aggregazione anche la classifica delle dieci proposte complete. Il contrario
non sarebbe possibile: votando le proposte intere si otterrebbe una classifica
sola, perdendo il dettaglio su quale taglio funziona e quale no.

**Da 270 confronti a una classifica.** Con 10 proposte e 6 tagli le coppie
possibili sono 45 per taglio, 270 in tutto. A ogni proposta si associa una
*forza* `p` e si assume

```
P(i batte j) = p_i / (p_i + p_j)
```

Le forze si stimano con l'algoritmo MM di Hunter, che cerca i valori che rendono
più probabili i voti raccolti. Rispetto alla semplice percentuale di vittorie il
modello pesa la qualità dell'avversario — battere il primo in classifica vale
più che battere l'ultimo — e non dipende dall'ordine di arrivo dei voti.

Il punteggio mostrato è la forza riportata sulla scala Elo,
`R = 1500 + (400/ln 10) · ln p`, così 100 punti di distacco valgono circa il 64%
di probabilità di vittoria e 400 punti valgono 10 a 1.

Spiegazione estesa nella pagina **Metodo** del sito.

---

## Avviare in locale

I file usano i moduli ES, che il browser non carica da `file://`. Serve un
server statico qualsiasi:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Senza backend configurato il sito funziona lo stesso: i voti restano nel
`localStorage` del browser e la classifica è personale. Utile per provare, non
per raccogliere opinioni.

## Test

Il motore di classifica non ha dipendenze e si prova subito:

```bash
npm test
```

Nove test: recupero delle forze da confronti simulati, comportamento con un
design imbattuto, indipendenza fra i tagli, aggregazione per famiglia,
restringimento dell'errore standard, selezione delle coppie.

Le regole di sicurezza Firestore si provano contro l'emulatore ufficiale, che
gira in locale (serve Java, e `npm install` una volta sola per le dipendenze di
sviluppo):

```bash
npm install
npm run test:rules
```

Ventitré test in due gruppi. I primi quindici colpiscono le regole con l'SDK
Firebase: scrivere un punteggio arbitrario, incrementare di 1000, togliere voti
agli altri, muovere entrambi i contatori insieme, creare una coppia inesistente,
riscrivere l'identità di una coppia, cancellare. Devono fallire tutti.

Gli altri otto fanno girare il codice vero di `src/store.js` contro l'emulatore.
Servono perché i due lati potrebbero non incastrarsi: le regole sono scritte
pensando all'SDK, mentre il sito parla REST con `updateMask` e
`updateTransforms`, che è una forma di scrittura diversa. Fra questi c'è il caso
che conta di più — venti voti simultanei sulla stessa coppia devono dare venti
voti contati, non uno perso.

---

## Attivare la classifica condivisa

Senza backend il sito funziona ma ogni visitatore vede solo i propri voti. Sono
supportati Firebase e Supabase; si sceglie con `BACKEND` in
[`config.js`](config.js).

### Firebase (Firestore)

1. Crea un progetto su [console.firebase.google.com](https://console.firebase.google.com)
   e, al suo interno, un **database Firestore** (modalità produzione).
2. Registra un'**app Web** (Impostazioni progetto → Le tue app → `</>`). Dei
   valori mostrati servono solo `projectId` e `apiKey`.
3. Pubblica le regole di sicurezza di
   [`firebase/firestore.rules`](firebase/firestore.rules). Dalla console
   (Firestore → Regole → incolla → Pubblica), oppure:

   ```bash
   npx firebase deploy --only firestore:rules
   ```

   **Non saltare questo passaggio.** Le regole predefinite di Firestore sono
   "nega tutto" (il sito non funzionerebbe) oppure "consenti tutto" per 30
   giorni (chiunque potrebbe cancellare la classifica).

4. Compila [`config.js`](config.js):

```js
export const BACKEND = 'firebase';
export const FIREBASE = {
  projectId: 'nome-del-progetto',
  apiKey: 'AIza...',
  host: '',
};
```

Il piano gratuito **Spark** basta: si usano solo Firestore e le sue regole,
niente Cloud Functions. I limiti gratuiti sono 50.000 letture e 20.000
scritture al giorno — un voto è una scrittura, e caricare la classifica costa
una lettura per coppia già votata (al massimo 270).

### Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Apri **SQL Editor** ed esegui [`supabase/schema.sql`](supabase/schema.sql):
   crea le tabelle, le policy e la funzione di voto.
3. Da **Project Settings → API** copia *Project URL* e la chiave **anon /
   public**, poi in [`config.js`](config.js):

```js
export const BACKEND = 'supabase';
export const SUPABASE = { url: 'https://xxxx.supabase.co', anonKey: 'eyJhbGci...' };
```

### Come sono protetti i dati

Le chiavi di entrambi i backend sono pubbliche per definizione: stanno nel
codice di un sito statico e non proteggono niente. A proteggere i dati sono le
regole di sicurezza. **Non usare mai una chiave di servizio** (`service_role` su
Supabase, le credenziali Admin SDK su Firebase): hanno pieni poteri e
scavalcherebbero ogni regola.

Le due architetture arrivano allo stesso risultato per strade diverse.

Su **Supabase** il browser non scrive mai nelle tabelle: chiama `cast_vote`, che
valida, applica un limite di frequenza e incrementa in modo atomico. Le policy
RLS e i GRANT lasciano al client anonimo un solo permesso, leggere gli
aggregati.

Su **Firebase**, senza Cloud Functions (che richiedono il piano a pagamento), il
browser scrive direttamente e sono le regole a fare il lavoro. Impongono che una
scrittura possa solo aggiungere 1 a un contatore, che l'id del documento
corrisponda alla coppia, che taglio e design esistano, e che niente si possa
cancellare.

| operazione | Firebase | Supabase |
| --- | --- | --- |
| leggere la classifica | sì | sì |
| aggiungere 1 a un contatore | sì | sì, tramite `cast_vote` |
| scrivere un punteggio arbitrario | no | no |
| togliere voti | no | no |
| cancellare dati | no | no |
| leggere il registro dei singoli voti | non esiste | no |

Su entrambi resta una cosa che le regole non possono fare: impedire a uno script
di inviare molti voti legittimi da +1. Il limite di frequenza di Supabase si
appoggia a un identificativo generato nel browser, quindi si aggira
rigenerandolo. Se la cosa diventasse un problema, la risposta su Firebase è
[App Check](https://firebase.google.com/docs/app-check) con reCAPTCHA, che
verifica la provenienza delle richieste ed è disponibile sul piano gratuito.

Se il backend è configurato ma irraggiungibile, il sito ripiega sulla modalità
locale e lo dichiara, invece di mostrare una pagina rotta.

---

## Pubblicare

Il workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) esegue i
test e pubblica il sito su GitHub Pages a ogni push sul branch di default. Il
sito è statico e senza build: si pubblica il repository così com'è.

Prima di pubblicare, il workflow esegue
[`tools/stamp-assets.mjs`](tools/stamp-assets.mjs), che aggiunge a CSS e script
un `?v=` derivato dal contenuto. GitHub Pages serve ogni file con dieci minuti
di cache indipendenti l'uno dall'altro: senza questa marcatura, nei minuti dopo
una pubblicazione un browser può ritrovarsi con l'HTML nuovo e il CSS vecchio, e
la pagina risulta rotta. Se modifichi CSS o JavaScript in locale puoi allineare
le impronte con `npm run stamp`, ma non è necessario: ci pensa la CI.

Alla prima esecuzione il workflow attiva Pages da sé
(`actions/configure-pages` con `enablement: true`), senza passare dalle
impostazioni.

**Serve però che Pages sia disponibile per il repository:** pubblico, oppure
privato con piano **GitHub Pro o Team**. Su un repository privato con piano
gratuito l'attivazione fallisce con un errore che sembra di permessi
(`Resource not accessible by integration`) ma è in realtà di disponibilità.
Per rendere pubblico il repository: **Settings → General → Danger Zone → Change
visibility**.

Se l'attivazione automatica non dovesse funzionare, la si fa una volta a mano da
**Settings → Pages → Source: GitHub Actions**, poi si rilancia il workflow da
**Actions → Pubblica su GitHub Pages → Run workflow**.

Il sito sarà su `https://<utente>.github.io/euro-banknote-rank/`.

Va bene anche qualunque altro hosting statico: non c'è build, si servono i file
così come sono.

Attenzione: `config.js` contiene la chiave `anon` ed è pensato per essere
pubblico, ma resta un file versionato — se in futuro rigeneri le chiavi del
progetto, ricordati di aggiornarlo.

---

## Struttura

```
index.html                     le quattro viste (vota, classifica, design, metodo)
config.js                      scelta del backend e relative chiavi
src/data.js                    le 10 proposte: designer, tema, descrizioni, immagini
src/rating.js                  Bradley–Terry, errori standard, scelta delle coppie
src/store.js                   accesso ai dati: Firestore, Supabase o localStorage
src/app.js                     interfaccia e instradamento
assets/css/style.css           foglio di stile unico, chiaro e scuro
assets/banknotes/              120 immagini WebP (60 fronti + 60 retri)
src/i18n.js                    testi dell'interfaccia in it/en/fr/de/es
src/design-texts.js            testi BCE dei design nelle 5 lingue (generato)
src/image-aspects.js           proporzioni delle 120 immagini (generato)
tools/stamp-assets.mjs         impronte anti-cache su CSS e script
firebase/firestore.rules       regole di sicurezza Firestore
supabase/schema.sql            tabelle, RLS, funzione di voto
test/rating.test.mjs           motore di classifica
test/firestore-rules.test.mjs  regole di sicurezza, contro l'emulatore
test/firestore-store.test.mjs  adattatore Firestore, contro l'emulatore
```

Il sito **non ha dipendenze a runtime**: è HTML, CSS e moduli ES serviti così
come sono. Le dipendenze in `package.json` servono solo a eseguire i test delle
regole Firestore.

**Tre proposte su dieci — D, I e J — sono disegnate in verticale**, ma la BCE
pubblica quasi tutti i loro file in orizzontale, con il contenuto ruotato di
90°: mostrarli così com'erano significava presentare quei disegni coricati. Le
immagini nel repository sono già raddrizzate. Il criterio non è a occhio: la
bandiera europea è sempre 3:2, quindi se in un'immagine risulta più alta che
larga il file è ruotato. L'unica eccezione è il fronte del 200 € della proposta
D, che la BCE pubblica già in verticale.

Le immagini sono ridimensionate a 1000 px sul lato lungo e convertite in WebP:
8,8 MB in tutto invece dei 41 MB degli originali, perché in una schermata di
voto se ne caricano quattro alla volta — fronte e retro di entrambe le
banconote. Gli originali ad alta risoluzione restano sul sito della BCE.

Il sito è disponibile in **italiano, inglese, francese, tedesco e spagnolo**. Le
descrizioni dei design non sono tradotte da noi: sono quelle ufficiali della
BCE, prese dalle rispettive versioni linguistiche della sua pagina, così ai
designer non vengono attribuite parole che non hanno scritto. Lingua e tema
(automatico, chiaro, scuro) si scelgono in fondo alla pagina e restano
memorizzati nel browser.

---

## Le dieci proposte

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

Ogni proposta copre tutti e sei i tagli (5, 10, 20, 50, 100, 200 €). Il retro è
pubblicato solo per il taglio da 5 €.

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
in alcun modo sulla scelta ufficiale del design. La consultazione ufficiale è
[il sondaggio della BCE](https://www.ecb.europa.eu/euro/banknotes/future_banknotes/html/design-proposals.en.html).

Il codice è dei rispettivi autori; le immagini restano soggette alle condizioni
d'uso della BCE sopra riportate.
