import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

/**
 * Überprüft die erforderlichen Umgebungsvariablen
 * 检查必需的环境变量
 */
function checkEnvironmentVariables() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ist nicht konfiguriert. ' +
      'Bitte fügen Sie diese Variable zu Ihrer .env.local Datei hinzu.'
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY ist nicht konfiguriert. ' +
      'Bitte fügen Sie diese Variable zu Ihrer .env.local Datei hinzu.'
    );
  }
}

// Überprüfen der Umgebungsvariablen
checkEnvironmentVariables();

// Initialisierung des Supabase-Clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase Umgebungsvariablen fehlen');
  // Rückgabe eines Dummy-Clients für Entwicklungszwecke
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  };
} else {
  // Erstellen des echten Supabase-Clients
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
}

export { supabase };

// Typen-Export für bessere Typsicherheit
export type Tables = Database['public']['Tables']
export type TableRow<T extends keyof Tables> = Tables[T]['Row']
export type TableInsert<T extends keyof Tables> = Tables[T]['Insert']
export type TableUpdate<T extends keyof Tables> = Tables[T]['Update'] 