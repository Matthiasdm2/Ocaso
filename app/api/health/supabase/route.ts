export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseServer();
  const results: {
    profiles?: { ok: boolean; error?: string; code?: string; rows?: number };
    listings?: { ok: boolean; error?: string; code?: string; rows?: number };
    anon_insert_listings?: string;
  } = {};

  // 1) Publieke SELECTS
  const p = await supabase.from("profiles").select("id").limit(1);
  results.profiles = p.error
    ? { ok: false, error: p.error.message, code: p.error.code }
    : { ok: true, rows: (p.data || []).length };

  const l = await supabase.from("listings").select("id,title,price").limit(1);
  results.listings = l.error
    ? { ok: false, error: l.error.message, code: l.error.code }
    : { ok: true, rows: (l.data || []).length };

  // 2) RLS sanity: anon INSERT hoort te blokkeren
  const ins = await supabase
    .from("listings")
    .insert({ title: "rls-test", price: 1 });
  results.anon_insert_listings = ins.error ? "blocked (ok)" : "ALLOWED (LEAK)";

  const ok = results.profiles.ok === true &&
    results.listings.ok === true &&
    results.anon_insert_listings === "blocked (ok)";

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
