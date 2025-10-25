// lib/supabaseServiceRole.ts
// Server-only elevated client. Never import in client code.
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env, getSupabaseServiceRoleKeyOptional } from "@/lib/env";

export function supabaseServiceRole() {
  const url = env.SUPABASE_URL;
  const serviceRole = getSupabaseServiceRoleKeyOptional();
  const anon = env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("supabaseServiceRole: missing NEXT_PUBLIC_SUPABASE_URL");
  // In development, allow falling back to anon to avoid hard crashes while wiring features.
  // NOTE: Only use service-role for server-only tasks and when available; anon is subject to RLS.
  const keyToUse = serviceRole || (env.NODE_ENV !== 'production' ? anon : null);
  if (!keyToUse) throw new Error("supabaseServiceRole: missing SUPABASE_SERVICE_ROLE_KEY");
  return createServerClient(url, keyToUse, {
    cookies: {
      get(name: string) { return cookies().get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) { cookies().set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { cookies().set({ name, value: "", ...options, maxAge: 0 }); },
    },
  });
}