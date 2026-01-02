"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect,useRef, useState } from "react";

import { getBaseUrl } from "@/lib/getBaseUrl";
import { createClient } from "@/lib/supabaseClient";

const OAUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_OAUTH !== "false";

/** Kleine inline iconen */
function IconGoogle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" {...props} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.61 20.08H42V20H24v8h11.27c-1.64 4.66-6.08 8-11.27 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.85 1.16 7.96 3.04l5.66-5.66C34.46 6.09 29.49 4 24 4 16.04 4 9.08 8.53 6.31 14.69z"
      />
      <path
        fill="#FF3D00"
        d="M6.31 14.69l6.57 4.82C14.3 16.95 18.82 14 24 14c3.06 0 5.85 1.16 7.96 3.04l5.66-5.66C34.46 6.09 29.49 4 24 4 16.04 4 9.08 8.53 6.31 14.69z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.8-1.95 13.31-5.12l-6.15-5.2C29.11 35.9 26.69 36.8 24 36.8c-5.16 0-9.56-3.31-11.19-7.94l-6.5 5.02C8.02 39.38 15.5 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.61 20.08H42V20H24v8h11.27c-.77 2.19-2.21 4.07-4.14 5.39l6.15 5.2C39.51 35.94 44 30.52 44 24c0-1.34-.14-2.65-.39-3.92z"
      />
    </svg>
  );
}
function IconFacebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props} aria-hidden>
      <path
        fill="currentColor"
        d="M22 12a10 10 0 10-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.3l-.4 3h-1.9v7A10 10 0 0022 12z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = createClient();
  const siteUrl = getBaseUrl();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [cooldown, setCooldown] = useState<number>(0);
  const [rateFirst, setRateFirst] = useState<number | null>(null);
  const [debugRate, setDebugRate] = useState<string | null>(null);
  const [oauthRedirectUrl, setOauthRedirectUrl] = useState<string | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const infoBoxRef = useRef<HTMLDivElement | null>(null);

  // Handle OAuth errors from callback
  useEffect(() => {
    const error = searchParams.get('error');
    const errorMsg = searchParams.get('msg');
    
    if (error) {
      if (error === 'oauth' || error === 'oauth_provider') {
        const message = errorMsg 
          ? `OAuth authenticatie mislukt: ${decodeURIComponent(errorMsg)}`
          : 'OAuth authenticatie mislukt. Probeer het opnieuw.';
        setErr(message);
      } else if (error === 'missing_code') {
        setErr('OAuth authenticatie onvolledig. Probeer het opnieuw.');
      } else if (error === 'oauth_exchange_failed') {
        const message = errorMsg 
          ? `OAuth code exchange mislukt: ${decodeURIComponent(errorMsg)}`
          : 'OAuth authenticatie mislukt. Probeer het opnieuw.';
        setErr(message);
      }
    }
  }, [searchParams]);

  function startCooldown(seconds: number) {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function dynamicCooldown() {
    const now = Date.now();
    if (!rateFirst) return 30; // eerste keer 30s
    // Als herhaald binnen 2 minuten venster, verhoog naar 60s
    if (now - rateFirst < 2 * 60 * 1000) return 60;
    return 30; // reset daarna
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || cooldown > 0) return; // single-flight + cooldown guard
    setErr(null);
    setInfo(null);
    setDebugRate(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const rawMsg = error.message || '';
        const lower = rawMsg.toLowerCase();
        const isRate = error.status === 429 || /rate limit/.test(lower);
        if (isRate) {
          const now = Date.now();
            if (!rateFirst) setRateFirst(now);
          const seconds = dynamicCooldown();
          startCooldown(seconds);
          setDebugRate(`status=${error.status || 'n/a'} msg="${rawMsg}"`);
          throw new Error(`Te veel inlogpogingen. Wacht ${seconds} seconden en probeer opnieuw.`);
        }
        if (lower.includes('invalid'))
          throw new Error('Combinatie e-mail/wachtwoord klopt niet.');
        if (lower.includes('email') && lower.includes('confirm')) {
          setInfo('E-mail nog niet bevestigd. Check je mailbox of kies “Wachtwoord vergeten”.');
          throw new Error('Bevestiging vereist.');
        }
        throw error;
      }
      // Succes: reset rate limit tracking
      setRateFirst(null); setDebugRate(null);
      window.location.href = '/profile';
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message ?? 'Inloggen mislukt.');
      } else {
        setErr('Inloggen mislukt.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInOAuth(provider: "google" | "facebook") {
    setErr(null);
    setInfo(null);
    setOauthRedirectUrl(null);
    setLoading(true);
    
    // Use window.location.origin in browser to ensure correct URL
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const redirectTo = `${currentOrigin}/auth/callback`;
    
    // Log to console AND show info message FIRST
    console.log(`[OAuth] Starting flow for ${provider}:`, {
      siteUrl,
      currentOrigin,
      redirectTo,
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'N/A',
      expectedInSupabase: `${currentOrigin}/auth/callback`,
    });
    
    // Show info immediately so user can see it
    setInfo(`🔄 OAuth flow wordt gestart voor ${provider}...\n\nRedirect URL die wordt gebruikt: ${redirectTo}\n\nDeze moet EXACT overeenkomen met wat er in Supabase Dashboard staat.`);
    
    // Small delay to ensure info is visible before making the call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Prevent any automatic redirects by storing current location
      const originalLocationHref = typeof window !== 'undefined' ? window.location.href : '';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { 
          redirectTo,
          // CRITICAL: Skip browser redirect so user can see the info first
          skipBrowserRedirect: true,
        },
      });
      
      // Check if page was redirected (shouldn't happen with skipBrowserRedirect: true)
      if (typeof window !== 'undefined' && window.location.href !== originalLocationHref) {
        console.warn('[OAuth] Page was redirected despite skipBrowserRedirect: true');
        console.warn('[OAuth] Original:', originalLocationHref);
        console.warn('[OAuth] Current:', window.location.href);
        setErr('Pagina werd automatisch doorgestuurd. Dit zou niet moeten gebeuren met skipBrowserRedirect: true.');
        setInfo(null);
        setLoading(false);
        return; // Stop execution if redirect happened
      }
      
      if (error) {
        console.error(`[OAuth] Error for ${provider}:`, error);
        const errorMsg = `OAuth fout: ${error.message}\n\nRedirect URL gebruikt: ${redirectTo}\n\nZorg dat deze EXACT overeenkomt met wat er in Supabase Dashboard staat:\n- Ga naar Authentication → URL Configuration\n- Controleer Redirect URLs\n- Moet bevatten: ${redirectTo}`;
        setErr(errorMsg);
        setInfo(null);
        setLoading(false);
      } else if (data?.url) {
        console.log(`[OAuth] Redirect URL for ${provider}:`, data.url);
        console.log(`[OAuth] Full redirect URL:`, data.url);
        console.log(`[OAuth] Expected redirectTo in Supabase:`, redirectTo);
        
        // Store URL in state so user can see it and copy it
        const redirectUrl = data.url;
        setOauthRedirectUrl(redirectUrl);
        setInfo(`✅ OAuth redirect URL ontvangen!\n\nGebruikte redirectTo: ${redirectTo}\n\nKlik op "Ga naar ${provider}" om door te gaan, of kopieer de informatie hieronder.`);
        
        // Don't redirect automatically - let user click a button
        setLoading(false);
      } else {
        console.warn(`[OAuth] No redirect URL returned for ${provider}`);
        setErr(`Geen redirect URL ontvangen van OAuth provider.\n\nControleer:\n1. Of ${redirectTo} exact staat in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs\n2. Of ${provider} is enabled in Supabase Dashboard → Authentication → Providers`);
        setInfo(null);
        setLoading(false);
      }
    } catch (e) {
      console.error(`[OAuth] Exception during OAuth for ${provider}:`, e);
      const errorMsg = e instanceof Error ? e.message : 'Onbekende OAuth fout.';
      setErr(`OAuth fout: ${errorMsg}\n\nRedirect URL: ${redirectTo}`);
      setInfo(null);
      setLoading(false);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const target = resetEmail || email;
      if (!target) throw new Error("Vul je e-mailadres in.");
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${siteUrl}/auth/reset`,
      });
      if (error) throw error;
      setInfo("Reset-mail verstuurd! Check je mailbox.");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message ?? "Kon reset-mail niet versturen.");
      } else {
        setErr("Kon reset-mail niet versturen.");
      }
    } finally {
      setLoading(false);
    }
  }

  const OAuthBtn = (p: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button
      type="button"
      onClick={p.onClick}
      disabled={p.disabled}
      className="w-full rounded-xl border border-gray-300 px-4 py-2 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {p.children}
    </button>
  );

  return (
    <div className="container py-10 flex justify-center">
      <div className="card p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Inloggen</h1>

        {OAUTH_ENABLED && (
          <div className="grid gap-2">
            <OAuthBtn 
              onClick={() => {
                console.log('[DEBUG] Google button clicked');
                signInOAuth("google");
              }}
              disabled={loading}
            >
              <IconGoogle />
              <span>{loading ? 'Bezig...' : 'Verder met Google'}</span>
            </OAuthBtn>
            <OAuthBtn 
              onClick={() => {
                console.log('[DEBUG] Facebook button clicked');
                signInOAuth("facebook");
              }}
              disabled={loading}
            >
              <IconFacebook />
              <span>{loading ? 'Bezig...' : 'Verder met Facebook'}</span>
            </OAuthBtn>
            {/* Apple login removed */}
            <div className="text-center text-sm text-gray-500">
              of met e-mail & wachtwoord
            </div>
          </div>
        )}
        {!OAUTH_ENABLED && (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
            OAuth is uitgeschakeld (NEXT_PUBLIC_ENABLE_OAUTH=false)
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2"
            required
            data-testid="login-email"
          />
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Wachtwoord"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10"
              required
              data-testid="login-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
              title={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
            >
              {/* eenvoudige oog/doorstreep icoon */}
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.58 10.58A3 3 0 0113.42 13.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17.94 17.94C16.08 19.17 14.09 20 12 20 7 20 3.1 16.36 1 12c1.15-2.18 2.95-4.06 5.14-5.37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          <button
            className="w-full rounded-xl bg-primary text-black px-4 py-2 font-medium disabled:opacity-60"
            disabled={loading || cooldown > 0}
            data-testid="login-submit"
          >
            {loading ? 'Bezig…' : cooldown > 0 ? `Wachten (${cooldown}s)` : 'Inloggen'}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button className="underline" onClick={() => setShowReset((v) => !v)}>
            Wachtwoord vergeten?
          </button>
          <Link href="/register" className="underline">
            Account aanmaken
          </Link>
        </div>

        {showReset && (
          <form onSubmit={sendReset} className="space-y-2 border-t pt-3">
            <p className="text-sm">We sturen je een reset-link per e-mail.</p>
            <input
              id="reset-email"
              name="resetEmail"
              type="email"
              placeholder="E-mail (indien anders)"
              autoComplete="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2"
            />
            <button
              className="w-full rounded-xl border px-4 py-2 font-medium disabled:opacity-60"
              disabled={loading}
            >
              Verstuur reset-mail
            </button>
          </form>
        )}

        {info && (
          <div 
            ref={infoBoxRef}
            id="oauth-info-box"
            className="bg-blue-50 border border-blue-200 rounded p-3"
          >
            <p className="text-blue-800 text-sm font-medium mb-1">Info:</p>
            <p className="text-blue-700 text-xs break-all whitespace-pre-line">{info}</p>
            {oauthRedirectUrl && (
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                <p className="font-mono break-all text-blue-900 mb-2">{oauthRedirectUrl}</p>
              </div>
            )}
            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigator.clipboard.writeText(info);
                  alert('Info gekopieerd naar klembord!');
                }}
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                Kopieer info
              </button>
              {oauthRedirectUrl && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigator.clipboard.writeText(oauthRedirectUrl);
                      alert('Redirect URL gekopieerd naar klembord!');
                    }}
                    className="text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    Kopieer redirect URL
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (oauthRedirectUrl) {
                        console.log('[OAuth] Manual redirect to:', oauthRedirectUrl);
                        window.location.href = oauthRedirectUrl;
                      }
                    }}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Ga naar OAuth provider →
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800 text-sm font-medium mb-1">Foutmelding:</p>
            <p className="text-red-700 text-xs break-all">{err}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(err);
                alert('Foutmelding gekopieerd naar klembord!');
              }}
              className="mt-2 text-xs text-red-600 underline"
            >
              Kopieer foutmelding
            </button>
          </div>
        )}
        {debugRate && process.env.NODE_ENV !== 'production' && (
          <p className="text-sm text-gray-400">{debugRate}</p>
        )}
      </div>
    </div>
  );
}
