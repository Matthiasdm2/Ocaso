import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST() {
  try {
    // Fix inconsistent status values: change 'active' to 'actief'
    const { error } = await supabaseServiceRole()
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
