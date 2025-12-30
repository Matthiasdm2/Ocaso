// lib/supabaseClient.ts
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** App-brede singleton client. Gebruik overal: const supabase = createClient() */
export function createClient() {
  if (client) return client;

  // Use environment variables, no fallbacks for deterministic tests
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');

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
export const supabase = typeof window !== "undefined"
  ? createClient()
  : ({} as unknown as SupabaseClient);
