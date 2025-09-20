// lib/supabaseClient.ts
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** App-brede singleton client. Gebruik overal: const supabase = createClient() */
export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Supabase: ontbrekende env vars. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  client = createSupabaseClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

/** Compat: laat ook `import { supabase } from '@/lib/supabaseClient'` werken */
export const supabase = createClient();
