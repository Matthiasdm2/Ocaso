// app/auth/callback/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=oauth", origin));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  // Succes → naar profiel of home
  return NextResponse.redirect(new URL("/profile", origin));
}
