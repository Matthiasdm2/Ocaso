import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function GET() {
  try {
    // Get RLS policies for all tables
    const { data, error } = await supabaseServiceRole()
      .from("pg_policies")
      .select("*")
      .in("tablename", ["listings", "conversations", "messages", "profiles"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ policies: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
