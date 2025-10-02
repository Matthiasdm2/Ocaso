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
    // Graceful no-op fallback: avoid crashing the entire client app when env vars are missing in production.
    // We log a warning once in the console (only browser) and return a minimal mock.
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __supabaseEnvWarned?: boolean };
      if (!w.__supabaseEnvWarned) {
        console.warn("[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Returning no-op client.");
        w.__supabaseEnvWarned = true;
      }
    }
    const noop = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithOAuth: async () => ({ data: null, error: { message: 'Supabase env vars missing' } }),
        signOut: async () => ({ error: null }),
      },
      from() {
        return {
          select: async () => ({ data: [], error: null }),
          insert: async () => ({ data: null, error: { message: 'env-missing' } }),
          update: async () => ({ data: null, error: { message: 'env-missing' } }),
          upsert: async () => ({ data: null, error: { message: 'env-missing' } }),
          delete: async () => ({ data: null, error: { message: 'env-missing' } }),
          eq: function() { return this; },
          order: function() { return this; },
          limit: function() { return this; },
          range: function() { return this; },
          or: function() { return this; },
  } as unknown as ReturnType<SupabaseClient['from']>;
      },
    } as unknown as SupabaseClient;
    return noop;
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
export const supabase = typeof window !== 'undefined' ? createClient() : ({} as unknown as SupabaseClient);
