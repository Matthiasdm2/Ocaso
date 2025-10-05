import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST() {
  try {
    // Try to disable RLS using raw SQL
    const { error } = await supabaseServiceRole()
      .rpc("exec_sql", {
        sql: "ALTER TABLE subcategories DISABLE ROW LEVEL SECURITY;",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
