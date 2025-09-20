"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type G = typeof globalThis & {
  __ocaso_supabase__?: ReturnType<typeof createSupabaseClient>;
};

const _g = globalThis as G;

export const supabase =
  _g.__ocaso_supabase__ ??
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true, // sessie in LocalStorage
        autoRefreshToken: true, // tokens automatisch verversen
        detectSessionInUrl: true, // voor oAuth callbacks
      },
    },
  );

if (process.env.NODE_ENV !== "production") {
  _g.__ocaso_supabase__ = supabase;
}

// compat helper, je project gebruikt dit patroon al op meerdere plekken
export function createClient() {
  return supabase;
}
