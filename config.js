/**
 * Configurazione del backend.
 *
 * Finché non ne configuri uno il sito funziona ugualmente, ma i voti vengono
 * salvati solo nel browser di chi vota (modalità "locale"): utile per provare,
 * inutile per una classifica collettiva.
 *
 * Le chiavi qui sotto sono pubbliche per definizione — sia quella di Firebase
 * sia la "anon" di Supabase sono pensate per stare nel codice di un sito
 * statico. Non sono loro a proteggere i dati: a farlo sono le regole di
 * sicurezza (`firebase/firestore.rules` oppure `supabase/schema.sql`).
 * Non mettere mai qui una chiave di servizio o di amministrazione.
 */

/** Quale backend usare: 'firebase' | 'supabase' | 'local' */
export const BACKEND = 'local';

/**
 * Firebase. Dalla console: Impostazioni progetto → Le tue app → app Web.
 * Servono solo questi due valori, non l'intero oggetto di configurazione.
 * Istruzioni passo passo nel README.
 */
export const FIREBASE = {
  projectId: '',
  apiKey: '',
  // Facoltativo: puntando all'emulatore locale (es. '127.0.0.1:8080') si
  // possono provare le regole di sicurezza senza toccare i dati veri.
  // Lasciare vuoto in produzione.
  host: '',
};

/**
 * Supabase. Da Project Settings → API: Project URL e chiave anon/public.
 */
export const SUPABASE = {
  url: '',
  anonKey: '',
};
