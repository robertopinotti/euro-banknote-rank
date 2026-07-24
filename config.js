/**
 * Configurazione del backend.
 *
 * Finché questi due valori restano vuoti il sito funziona ugualmente, ma i voti
 * vengono salvati solo nel browser di chi vota (modalità "locale"): utile per
 * provare il sito, inutile per una classifica collettiva.
 *
 * Per attivare la classifica condivisa: crea un progetto su https://supabase.com,
 * esegui supabase/schema.sql nell'SQL Editor e incolla qui URL e chiave anon.
 * Istruzioni passo passo nel README.
 *
 * La chiave "anon" è pubblica per progetto: è pensata per stare nel codice di un
 * sito statico. La sicurezza è affidata alle policy RLS definite nello schema,
 * che impediscono di scrivere direttamente nelle tabelle. Non mettere mai qui la
 * chiave "service_role".
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
