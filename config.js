/**
 * Configurazione del backend.
 *
 * Finché non ne configuri uno il sito funziona ugualmente, ma i voti vengono
 * salvati solo nel browser di chi vota (modalità "locale"): utile per provare,
 * inutile per una classifica collettiva.
 *
 * La chiave qui sotto è pubblica per definizione: quella di Firebase è pensata
 * per stare nel codice di un sito statico. Non è lei a proteggere i dati, a
 * farlo sono le regole di sicurezza (`firebase/firestore.rules`). Non mettere
 * mai qui una chiave di servizio o le credenziali dell'Admin SDK.
 */

/** Quale backend usare: 'firebase' | 'local' */
export const BACKEND = 'firebase';

/**
 * Firebase. Dalla console: Impostazioni progetto → Le tue app → app Web.
 * Servono solo questi due valori, non l'intero oggetto di configurazione.
 * Istruzioni passo passo nel README.
 */
export const FIREBASE = {
  projectId: 'euro-banknote-rank-bc351',
  apiKey: 'AIzaSyC2J56TI0rdaSrT0yDjBugmM-Onsgf9zJI',
  // Facoltativo: puntando all'emulatore locale (es. '127.0.0.1:8080') si
  // possono provare le regole di sicurezza senza toccare i dati veri.
  // Lasciare vuoto in produzione.
  host: '',
};
