// app/api/profile/upsert/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

type UpsertPayload = Partial<{
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  address: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  notifications: Record<string, unknown> | null;
  full_name: string | null;
}>;

export async function PUT(req: Request) {
  const anon = supabaseServer();
  let { data: { user } } = await anon.auth.getUser();
  if (!user) {
    // Fallback: Authorization: Bearer <token>
    const auth = req.headers.get('authorization');
    const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const alt = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const got = await alt.auth.getUser();
      if (got.data.user) {
        user = got.data.user;
      }
    }
  }
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: UpsertPayload = {};
  try { body = await req.json() as UpsertPayload; } catch { /* ignore */ }

  // Alleen toegestane kolommen; forceer id = auth.uid()
  const allowed: UpsertPayload & { id?: string } = {};
  const allowKeys = [
    "email", "phone", "avatar_url", "bio",
    "address", "preferences", "notifications", "full_name",
  ] as const satisfies Readonly<Array<keyof UpsertPayload>>;
  function assign<K extends keyof UpsertPayload>(key: K) {
    const v = body[key];
    if (typeof v !== 'undefined') {
      allowed[key] = v;
    }
  }
  for (const k of allowKeys) assign(k);
  allowed.id = user.id;

  try {
    const service = supabaseServiceRole();
    const { data: upserted, error } = await service
      .from("profiles")
      .upsert(allowed)
      .select("id, full_name, email, phone, avatar_url, bio, address, preferences, notifications")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: true, profile: upserted },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // Fallback zonder service role: probeer update met RLS, enkel eigen rij
    const { data: updated, error: updErr } = await anon
      .from("profiles")
      .update(allowed)
      .eq("id", user.id)
      .select("id, full_name, email, phone, avatar_url, bio, address, preferences, notifications")
      .single();
    if (updErr) {
      return NextResponse.json({ error: updErr.message || 'Kon profiel niet opslaan' }, { status: 400 });
    }
    return NextResponse.json(
      { ok: true, profile: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
