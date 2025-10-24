import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Fix inconsistent status values: change 'active' to 'actief'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin() as any)
      .from("listings")
      .update({ status: "actief" })
      .eq("status", "active");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Status values fixed" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
