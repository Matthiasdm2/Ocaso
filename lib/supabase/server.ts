import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from "@/types/supabase";

let _admin: ReturnType<typeof createClient<Database>> | null = null;

export function supabaseAdmin() {
  if (_admin) return _admin;

  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL ontbreekt');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt (server)');

  _admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'ocaso-admin-server' } },
  });

  return _admin;
}
