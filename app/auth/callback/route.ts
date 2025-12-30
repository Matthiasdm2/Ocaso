// app/auth/callback/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=oauth", origin));
    }

    // After successful auth, ensure profile is populated from auth metadata
    try {
      await fetch(`${origin}/api/profile/upsert-from-auth`, {
        method: 'POST',
        headers: {
          'Cookie': req.headers.get('cookie') || '',
        },
      });
    } catch (upsertError) {
      // Log error but don't fail the auth flow
      console.error('Failed to upsert profile from auth:', upsertError);
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  // Succes → naar profiel of home
  return NextResponse.redirect(new URL("/profile", origin));
}
