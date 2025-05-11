import { supabaseAdmin } from '@/lib/supabase-server';

export default async function Notes() {
  const { data: notes } = await supabaseAdmin.from("notes").select();

  return <pre>{JSON.stringify(notes, null, 2)}</pre>;
}