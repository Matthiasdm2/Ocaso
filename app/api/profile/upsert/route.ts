export const runtime = "nodejs";
// app/api/profile/upsert/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const dynamic = "force-dynamic";

type UpsertPayload = Partial<{
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  address: Record<string, unknown> | null;
  bank: { iban?: string; bic?: string } | null;
  preferences: Record<string, unknown> | null;
  notifications: Record<string, unknown> | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}>;

export async function PUT(req: Request) {
  // For E2E tests, skip server cookie auth and use Authorization header directly
  const auth = req.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7)
    : null;
    
  let user = null;
  
  if (token) {
    // Use Authorization header directly (for E2E tests)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const alt = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const got = await alt.auth.getUser();
    console.log("User from Authorization header:", got.data.user?.id);
    user = got.data.user;
  }
  
  if (!user) {
    // Fallback to server cookie auth
    const anon = supabaseServer();
    const { data: { user: serverUser } } = await anon.auth.getUser();
    console.log("User from supabaseServer:", serverUser?.id);
    user = serverUser;
  }
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: UpsertPayload = {};
  try {
    body = await req.json() as UpsertPayload;
  } catch { /* ignore */ }

  // Alleen toegestane kolommen; forceer id = auth.uid()
  const allowed: UpsertPayload & { id?: string } = {};
  const allowKeys = [
    "email",
    "phone",
    "avatar_url",
    "bio",
    "address",
    "bank",
    "preferences",
    "notifications",
    "full_name",
    "first_name",
    "last_name",
  ] as const satisfies Readonly<Array<keyof UpsertPayload>>;
  function assign<K extends keyof UpsertPayload>(key: K) {
    const v = body[key];
    if (typeof v !== "undefined") {
      allowed[key] = v;
    }
  }
  for (const k of allowKeys) assign(k);
  allowed.id = user.id;

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY missing from environment");
      return NextResponse.json({ error: "service_role_missing" }, {
        status: 503,
      });
    }
    const service = supabaseServiceRole();
    console.log("Attempting profile upsert with service role client");
    const { data: upserted, error } = await service
      .from("profiles")
      .upsert(allowed)
      .select(
        "id, full_name, first_name, last_name, email, phone, avatar_url, bio, address, bank, preferences, notifications",
      )
      .single();
    if (error) {
      console.error("Service role upsert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.log("Service role upsert successful");
    return NextResponse.json(
      { ok: true, profile: upserted },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("Service role client creation failed:", e);
    // Fallback zonder service role: probeer update met RLS, enkel eigen rij
    console.log("Falling back to anon client with RLS");
    const fallbackClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    
    const { data: updated, error: updErr } = await fallbackClient
      .from("profiles")
      .update(allowed)
      .eq("id", user.id)
      .select(
        "id, full_name, first_name, last_name, email, phone, avatar_url, bio, address, bank, preferences, notifications",
      )
      .single();
    if (updErr) {
      console.error("RLS fallback update failed:", updErr);
      return NextResponse.json({
        error: updErr.message || "Kon profiel niet opslaan",
        details: updErr.details,
        hint: updErr.hint
      }, { status: 400 });
    }
    console.log("RLS fallback update successful");
    return NextResponse.json(
      { ok: true, profile: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
