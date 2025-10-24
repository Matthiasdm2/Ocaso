import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

let supabasePublic: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  throw new Error('Supabase env vars ontbreken: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY');
}

export function getSupabasePublic() {
  if (!supabasePublic) {
    supabasePublic = createClient(url, anon, { auth: { persistSession: false } });
  }
  return supabasePublic;
}

export function getSupabaseAdmin() {
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt op server');
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, service, { auth: { persistSession: false } });
  }
  return supabaseAdmin;
}
