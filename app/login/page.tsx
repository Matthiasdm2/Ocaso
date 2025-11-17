"use client";

import Link from "next/link";
import { useRef, useState } from "react";

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
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
  options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) setErr(error.message);
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

  const OAuthBtn = (p: { onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={p.onClick}
      className="w-full rounded-xl border border-gray-300 px-4 py-2 font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
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
            <OAuthBtn onClick={() => signInOAuth("google")}>
              <IconGoogle />
              <span>Inloggen met Google</span>
            </OAuthBtn>
            <OAuthBtn onClick={() => signInOAuth("facebook")}>
              <IconFacebook />
              <span>Inloggen met Facebook</span>
            </OAuthBtn>
            {/* Apple login removed */}
            <div className="text-center text-sm text-gray-500">
              of met e-mail & wachtwoord
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Wachtwoord"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10"
              required
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
              type="email"
              placeholder="E-mail (indien anders)"
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

        {info && <p className="text-green-600 text-sm">{info}</p>}
        {err && <p className="text-red-500 text-sm">{err}</p>}
        {debugRate && process.env.NODE_ENV !== 'production' && (
          <p className="text-sm text-gray-400">{debugRate}</p>
        )}
      </div>
    </div>
  );
}
