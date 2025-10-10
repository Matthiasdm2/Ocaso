export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = supabaseServer();
    // 1) Publiek leesrecht testen
    const p = await supabase.from("profiles").select("id").limit(1);
    if (p.error) throw new Error(`profiles: ${p.error.message}`);

    const l = await supabase
      .from("listings")
      .select("id,title,price,seller_id,created_at")
      .limit(1);

    if (l.error) throw new Error(`listings: ${l.error.message}`);

    // 2) RLS sanity: anon INSERT hoort te falen
    const bad = await supabase
      .from("listings")
      .insert({ title: "rls-test", price: 1 });
    if (!bad.error) {
      return NextResponse.json(
        { ok: false, warning: "RLS lekt: anon insert toegestaan" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMessage }, {
      status: 500,
    });
  }
}
