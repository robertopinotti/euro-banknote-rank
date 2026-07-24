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

```bash
node --test test/rating.test.mjs
```

Nove test sul motore di classifica: recupero delle forze da confronti simulati,
comportamento con un design imbattuto, indipendenza fra i tagli, aggregazione
per famiglia, restringimento dell'errore standard, selezione delle coppie.

---

## Attivare la classifica condivisa

1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. Apri **SQL Editor** e incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql).
   Esegui: crea le due tabelle, le policy e la funzione di voto.
3. Vai in **Project Settings → API** e copia *Project URL* e la chiave **anon /
   public**.
4. Incollale in [`config.js`](config.js):

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

La chiave `anon` è pubblica per definizione: è fatta per stare nel codice di un
sito statico. **Non usare mai la chiave `service_role`**, che ha pieni poteri sul
database.

### Come sono protetti i dati

Il browser non scrive mai direttamente nelle tabelle. Vota chiamando la funzione
`cast_vote`, che valida i parametri, applica un limite di frequenza e incrementa
gli aggregati in modo atomico. Le policy RLS e i GRANT, verificati su una
istanza PostgreSQL reale, lasciano al client anonimo esattamente un permesso:

| operazione | client anonimo |
| --- | --- |
| leggere `pair_stats` (gli aggregati che formano la classifica) | sì |
| leggere `votes` (il registro dei singoli voti) | no |
| scrivere in `pair_stats` o `votes` | no |
| chiamare `cast_vote` | sì, max 60 voti al minuto |

Il limite di frequenza si appoggia a un identificativo generato nel browser:
ferma gli script e i doppioni accidentali, non un votante deciso a insistere. Per
un sito di questo tipo è una difesa proporzionata; se servisse di più, la strada
è l'autenticazione vera.

Se il backend è configurato ma irraggiungibile, il sito ripiega sulla modalità
locale e lo dichiara, invece di mostrare una pagina rotta.

---

## Pubblicare

Basta un hosting statico qualsiasi. Con GitHub Pages: **Settings → Pages →
Deploy from a branch**, scegli il branch e la cartella `/ (root)`.

Attenzione: `config.js` contiene la chiave `anon` ed è pensato per essere
pubblico, ma resta un file versionato — se in futuro rigeneri le chiavi del
progetto, ricordati di aggiornarlo.

---

## Struttura

```
index.html              le quattro viste (vota, classifica, design, metodo)
config.js               URL e chiave Supabase — vuoti = modalità locale
src/data.js             le 10 proposte: designer, tema, descrizioni, immagini
src/rating.js           Bradley–Terry, errori standard, scelta delle coppie
src/store.js            accesso ai dati: Supabase o localStorage
src/app.js              interfaccia e instradamento
assets/css/style.css    foglio di stile unico, chiaro e scuro
assets/banknotes/       70 immagini WebP (60 fronti + 10 retri del 5 €)
supabase/schema.sql     tabelle, RLS, funzione di voto
test/rating.test.mjs    test del motore di classifica
```

Le immagini sono ridimensionate a 1000 px sul lato lungo e convertite in WebP:
5,4 MB in tutto invece dei 22,7 MB degli originali, perché in una schermata di
voto se ne caricano due alla volta. Gli originali ad alta risoluzione restano sul
sito della BCE.

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
- Si vota il fronte delle banconote, più il retro del 5 €.

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
