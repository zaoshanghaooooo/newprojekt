import { createClient } from '@supabase/supabase-js';

// Supabase Konfiguration / Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Verwenden Sie den Service Role Key für Backend-Operationen / Use Service Role Key for backend operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  let missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  // Log to server console for debugging
  console.error(`Error: Missing Supabase environment variables: ${missingVars.join(', ')}. Please ensure these are set in your .env file or server environment.`);
  // Throw an error to prevent the application from running with incomplete configuration
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
}

// Supabase Client erstellen (mit Service Role Key für Backend-Operationen)
// This client has elevated privileges and should only be used server-side.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datenbank-Hilfsfunktionen
export const db = {
  // Bestellungen
  async getOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Gerichte
  async getDishes() {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Drucker
  async getPrinters() {
    const { data, error } = await supabase
      .from('printers')
      .select('*');
    
    if (error) throw error;
    return data;
  },

  // Namespace for dishes CRUD operations, as used in route.ts
  dishes: {
    async create(dishData: any) { // Used by POST /api/dishes
      // Supabase insert expects an object or an array of objects.
      const { data, error } = await supabase
        .from('dishes')
        .insert(dishData) // Pass dishData directly
        .select() // Return the created record(s)
        .single(); // Expecting a single record to be returned
      if (error) {
        console.error('Error creating dish in Supabase db.ts:', error);
        throw error; // Rethrow to be caught by the route handler
      }
      return data;
    },
    async update(id: number, dishData: any) { // Used by PUT /api/dishes/[id]
      const { data, error } = await supabase
        .from('dishes')
        .update(dishData)
        .eq('id', id)
        .select() // Return the updated record
        .single(); // Expecting a single record to be returned
      if (error) {
        console.error(`Error updating dish with id ${id} in Supabase db.ts:`, error);
        throw error;
      }
      return data;
    },
    async delete(id: number) { // Used by DELETE /api/dishes/[id]
      const { data, error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', id)
        .select() // Optionally return the deleted record
        .single(); // Expecting a single record
      if (error) {
        console.error(`Error deleting dish with id ${id} in Supabase db.ts:`, error);
        throw error;
      }
      return data; // Or return a simple success status like { success: true }
    }
  }
};

export default db;