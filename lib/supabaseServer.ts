// lib/supabaseServer.ts
/* eslint-disable simple-import-sort/imports */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client that can read the Next.js cookies to determine
 * the current logged-in user (when the browser sent the session cookie).
 * Use throughout server routes to call `supabase.auth.getUser()` and other
 * methods that rely on the request cookies.
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Supabase server client: missing NEXT_PUBLIC_SUPABASE_URL env var.");
  if (!anon) throw new Error("Supabase server client: missing NEXT_PUBLIC_SUPABASE_ANON_KEY env var.");

  if (process.env.NODE_ENV !== "production") console.debug("supabaseServer: using anon key server client");

  const client = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies().set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookies().set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  return client;
}
