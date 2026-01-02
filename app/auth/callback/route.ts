// app/auth/callback/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams, origin, pathname, search } = url;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const errorCode = searchParams.get("error_code");

  // Log all callback parameters for debugging
  const callbackInfo = {
    fullUrl: req.url,
    pathname,
    search,
    origin,
    hasCode: !!code,
    hasError: !!error,
    error,
    errorCode,
    errorDescription,
    allParams: Object.fromEntries(searchParams.entries()),
  };
  console.log('[OAuth Callback] Received:', JSON.stringify(callbackInfo, null, 2));
  
  // Also log to a file or persistent storage if needed (for production debugging)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[OAuth Callback] Full details:', callbackInfo);
  }

  // Check for OAuth provider errors first
  if (error) {
    console.error('[OAuth Callback] Provider error:', { error, errorCode, errorDescription });
    const errorParam = errorDescription 
      ? `oauth_provider&msg=${encodeURIComponent(errorDescription)}`
      : 'oauth_provider';
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, origin));
  }

  // Check if code is present
  if (!code) {
    console.error('[OAuth Callback] Missing code parameter');
    console.error('[OAuth Callback] Full URL:', req.url);
    console.error('[OAuth Callback] All search params:', Object.fromEntries(searchParams.entries()));
    console.error('[OAuth Callback] Expected redirect URL should be in Supabase Dashboard');
    
    // Show more helpful error message
    const errorMsg = `Geen OAuth code ontvangen. Controleer of ${origin}/auth/callback exact staat in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`;
    return NextResponse.redirect(new URL(`/login?error=missing_code&msg=${encodeURIComponent(errorMsg)}`, origin));
  }

  // Create supabase client for code exchange
  const supabase = supabaseServer();
  
  // Exchange code for session
  console.log('[OAuth Callback] Exchanging code for session...');
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (exchangeError) {
    console.error('[OAuth Callback] Exchange error:', exchangeError);
    // Include error message in redirect for debugging
    const errorMsg = exchangeError.message || 'oauth_exchange_failed';
    return NextResponse.redirect(new URL(`/login?error=oauth&msg=${encodeURIComponent(errorMsg)}`, origin));
  }

  if (!data?.session) {
    console.error('[OAuth Callback] No session returned from exchangeCodeForSession');
    return NextResponse.redirect(new URL("/login?error=oauth&msg=no_session", origin));
  }

  console.log('[OAuth Callback] Session created successfully for user:', data.session.user.email);

  // After successful auth, ensure profile is populated from auth metadata
  try {
    const upsertResponse = await fetch(`${origin}/api/profile/upsert-from-auth`, {
      method: 'POST',
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });

    if (!upsertResponse.ok) {
      console.warn('Profile upsert returned non-OK status:', upsertResponse.status);
      // Don't fail auth flow if profile upsert fails
    }
  } catch (upsertError) {
    // Log error but don't fail the auth flow
    console.error('Failed to upsert profile from auth:', upsertError);
  }

  // Succes → naar profiel of home
  return NextResponse.redirect(new URL("/profile", origin));
}
