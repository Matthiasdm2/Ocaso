import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Only return presence booleans, never the values
  const present = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // Test if service role client can be initialized
  let serviceRoleOk = false;
  let serviceRoleError = null;
  let queryTest = null;
  try {
    const client = supabaseAdmin();
    serviceRoleOk = true;
    // Test a simple query
    const { count, error } = await client.from("profiles").select("*", {
      count: "exact",
      head: true,
    });
    if (error) {
      queryTest = { success: false, error: error.message };
    } else {
      queryTest = { success: true, count };
    }
  } catch (e) {
    serviceRoleError = e instanceof Error ? e.message : "Unknown error";
  }

  return NextResponse.json({
    present,
    serviceRole: { ok: serviceRoleOk, error: serviceRoleError, queryTest },
  });
}
