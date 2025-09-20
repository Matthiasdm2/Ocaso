/* eslint-disable simple-import-sort/imports */
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/auth/sync  Body: { access_token, refresh_token }
// Doel: client session tokens omzetten naar server cookies zodat server routes user zien.
export async function POST(req: Request) {
  let body: { access_token?: string; refresh_token?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Tokens required" }, { status: 400 }); }

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error || !data.session) {
      return NextResponse.json({ error: "Could not set session" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, user: { id: data.session.user.id, email: data.session.user.email } });
  } catch (e) {
    console.error("[auth/sync] error", e);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
