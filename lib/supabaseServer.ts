// lib/supabaseServer.ts
/* eslint-disable simple-import-sort/imports */
import { type CookieOptions, createServerClient } from "@supabase/ssr";
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

  if (!url || !anon) {
    // Graceful server-side fallback to avoid 500 during misconfiguration
    if (process.env.NODE_ENV !== "production") {
      console.warn("[supabaseServer] Missing env vars, returning no-op client");
    }
    const noop = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        exchangeCodeForSession: async () => ({
          data: null,
          error: { message: "env-missing" },
        }),
      },
      from() {
        return {
          select: async () => ({ data: [], error: null }),
          insert: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          update: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          upsert: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          delete: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          eq: function () {
            return this;
          },
          order: function () {
            return this;
          },
          limit: function () {
            return this;
          },
          range: function () {
            return this;
          },
          or: function () {
            return this;
          },
        } as unknown as ReturnType<
          ReturnType<typeof createServerClient>["from"]
        >;
      },
    } as unknown as ReturnType<typeof createServerClient>;
    return noop;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("supabaseServer: using anon key server client");
  }

  const client = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Belangrijk: gedeeld cookie-domein en secure in prod
        cookies().set({
          name,
          value,
          ...options,
          domain: '.ocaso.be',
          secure: true,
          sameSite: 'lax',
          httpOnly: true,
        });
      },
      remove(name: string, options: CookieOptions) {
        cookies().set({
          name,
          value: '',
          ...options,
          domain: '.ocaso.be',
          secure: true,
          sameSite: 'lax',
          httpOnly: true,
          maxAge: 0,
        });
      },
    },
  });

  return client;
}

/**
 * Admin server-side Supabase client that uses the service role key.
 * This bypasses RLS policies and should only be used for admin operations.
 * Use throughout admin server routes for operations that need full database access.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    // Graceful server-side fallback to avoid 500 during misconfiguration
    if (process.env.NODE_ENV !== "production") {
      console.warn("[supabaseAdmin] Missing env vars, returning no-op client");
    }
    const noop = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from() {
        return {
          select: async () => ({ data: [], error: null }),
          insert: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          update: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          upsert: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          delete: async () => ({
            data: null,
            error: { message: "env-missing" },
          }),
          eq: function () {
            return this;
          },
          order: function () {
            return this;
          },
          limit: function () {
            return this;
          },
          range: function () {
            return this;
          },
          or: function () {
            return this;
          },
        } as unknown as ReturnType<
          ReturnType<typeof createServerClient>["from"]
        >;
      },
    } as unknown as ReturnType<typeof createServerClient>;
    return noop;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("supabaseAdmin: using service role server client");
  }

  // Create client with service role key (bypasses RLS)
  const client = createServerClient(url, serviceRole, {
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
