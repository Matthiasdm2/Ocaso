"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Autocomplete } from "@/components/Autocomplete";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { createClient } from "@/lib/supabaseClient";

/** OAuth-knoppen tonen? Zet in .env.local eventueel:
 * NEXT_PUBLIC_ENABLE_OAUTH=false   // om ze te verbergen tijdens dev
 */
const OAUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_OAUTH !== "false";

/** Helpers */
const validateEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
const validatePassword = (v: string) => v.length >= 8;
const required = (s?: string) => !!s && s.trim().length > 0;
const normalizeBEVAT = (v: string) => {
  const raw = v.replace(/[^0-9]/g, "");
  return raw ? (raw.startsWith("0") ? `BE${raw.slice(1)}` : `BE${raw}`) : "";
};
const looksLikeBEVAT = (v: string) => /^BE[0-9]{10}$/.test(v);
const looksLikeIBAN = (v: string) =>
  /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(v.replace(/\s/g, "").toUpperCase());

/** Kleine inline iconen (lichtgewicht) */
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

export default function RegisterPage() {
  const supabase = createClient();
  // no router redirect; we show inline success notice after sign-up
  const siteUrl = getBaseUrl();

  // Basis
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Contact/adres
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [bus, setBus] = useState("");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("België");

  // Zakelijk
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [vat, setVat] = useState("");
  const [website, setWebsite] = useState("");
  const [iban, setIban] = useState("");

  // Toestemmingen + UI
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const cooldownRef = useRef<number | null>(null);

  function startResendCooldown(seconds: number) {
  if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    setResendCooldown(seconds);
    cooldownRef.current = window.setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function saveDraftProfile() {
    const draft = {
      isBusiness,
  firstName,
  lastName,
      email,
      phone,
      address: { street, number, bus, postal, city, country },
      company: isBusiness
        ? { companyName, vat: normalizeBEVAT(vat), website, iban }
        : undefined,
      marketingOptIn,
      agreeTerms,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("ocaso_profile_draft", JSON.stringify(draft));
    } catch {
      // Ignoring localStorage errors (e.g., quota exceeded)
    }
  }

  async function registerEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    // Validatie
  if (!required(firstName)) return setErr("Vul je voornaam in.");
  if (!required(lastName)) return setErr("Vul je achternaam in.");
    if (!validateEmail(email)) return setErr("E-mailadres is ongeldig.");
    if (!validatePassword(password))
      return setErr("Wachtwoord moet minstens 8 tekens zijn.");
    if (password !== confirm) return setErr("Wachtwoorden komen niet overeen.");
    if (!agreeTerms) return setErr("Je moet de voorwaarden accepteren.");

    if (isBusiness) {
      const v = normalizeBEVAT(vat);
      if (v && !looksLikeBEVAT(v))
        return setErr("BTW-nummer lijkt ongeldig (formaat: BE0123456789).");
      if (iban && !looksLikeIBAN(iban)) return setErr("IBAN lijkt ongeldig.");
      if (!required(companyName)) return setErr("Vul je bedrijfsnaam in.");
    }

    // Throttle: voorkom herhaaldelijke signups binnen 60s (rate limit)
    try {
      const last = typeof window !== 'undefined' ? Number(localStorage.getItem('ocaso:lastSignUpAt') || '0') : 0;
      if (last && Date.now() - last < 60000) {
        const left = Math.ceil((60000 - (Date.now() - last)) / 1000);
        setErr(`Even wachten… probeer opnieuw over ${left}s.`);
        return;
      }
    } catch { /* ignore */ }

    setLoading(true);
    try {
      // (optioneel) lokaal concept bewaren
      saveDraftProfile();

  const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: [firstName, lastName].filter(Boolean).join(" "),
            phone,
            address: { street, number, bus, postal, city, country },
            is_business: isBusiness,
            company_name: isBusiness ? companyName : "",
            vat: isBusiness ? normalizeBEVAT(vat) : "",
            website: isBusiness ? website : "",
            iban: isBusiness ? iban : "",
            marketing_opt_in: marketingOptIn,
          },
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (error.status === 429 || msg.includes('rate') || msg.includes('too many')) {
      startResendCooldown(60);
      throw new Error('Te veel e-mails in korte tijd. Wacht 60 seconden en probeer opnieuw.');
    }
    if (error.status === 504 || msg.includes('timeout') || msg.includes('context deadline')) {
      throw new Error('Tijdelijke storing bij e-mailverzending. Probeer het zo meteen opnieuw.');
    }
    if (msg.includes('smtp') || msg.includes('mailer') || msg.includes('invalid login')) {
      throw new Error('E-mailserver is tijdelijk onbereikbaar. Probeer later opnieuw.');
    }
    throw error;
  }

  // Check if we're in local development (no email confirmation needed)
  const isLocalDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('local')
  );

  if (isLocalDev) {
    // In local development, user is automatically signed in
    setOk("Account aangemaakt! Je bent nu ingelogd.");
    // Redirect to profile after a short delay
    setTimeout(() => {
      window.location.href = '/profile';
    }, 1000);
    return;
  }

  try { localStorage.setItem('ocaso:lastSignUpAt', String(Date.now())); } catch { /* ignore */ }
  // Toon melding i.p.v. directe redirect
  setOk("Verificatiemail verstuurd! Check je mailbox om je account te bevestigen.");
  // Optioneel: scroll naar boven voor zichtbaarheid
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
    } catch (e: unknown) {
      console.error("signup error", e);
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Er ging iets mis.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setErr(null);
    if (resendCooldown > 0) return;
    try {
      startResendCooldown(60);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${siteUrl}/auth/callback` },
      });
      if (error) throw error;
      setOk('Nieuwe verificatiemail verstuurd.');
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message);
      else setErr('Kon geen nieuwe verificatiemail sturen.');
    }
  }

  async function signInOAuth(provider: "google" | "facebook") {
    setErr(null);
    setOk(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
  options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) setErr(error.message);
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

  // Address suggestion helpers (OpenStreetMap Nominatim)
  async function fetchStreetOptions(q: string) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    // Belgian addresses only, street query; append postal/city to improve relevance
    const qParts = [q];
    if (postal) qParts.push(postal);
    if (city) qParts.push(city);
    url.searchParams.set("q", qParts.join(" "));
    url.searchParams.set("countrycodes", "be");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    const res = await fetch(url.toString(), { headers: { "Accept-Language": "nl" } });
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
      .filter((d) => d?.address?.road)
      .map((d) => ({
        label: `${d.address.road}${d.address.house_number ? ' ' + d.address.house_number : ''} – ${d.address.postcode ?? ''} ${d.address.city ?? d.address.town ?? d.address.village ?? ''}`.trim(),
        value: d.address.road as string,
        meta: {
          postcode: d.address.postcode || '',
          city: d.address.city || d.address.town || d.address.village || '',
        },
      }));
  }
  async function fetchCityOptions(q: string) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q + (postal ? ` ${postal}` : ""));
    url.searchParams.set("countrycodes", "be");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    url.searchParams.set("featuretype", "city");
    const res = await fetch(url.toString(), { headers: { "Accept-Language": "nl" } });
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
      .map((d) => ({
        label: `${d.address.city || d.address.town || d.address.village || ''} ${d.address.postcode ? '(' + d.address.postcode + ')' : ''}`.trim(),
        value: (d.address.city || d.address.town || d.address.village || '') as string,
        meta: { postcode: d.address.postcode || '' },
      }))
      .filter((o) => o.value);
  }
  async function fetchPostalOptions(q: string) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("countrycodes", "be");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    const res = await fetch(url.toString(), { headers: { "Accept-Language": "nl" } });
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
      .filter((d) => d?.address?.postcode)
      .map((d) => ({
        label: `${d.address.postcode} ${d.address.city || d.address.town || d.address.village || ''}`.trim(),
        value: d.address.postcode as string,
        meta: { city: d.address.city || d.address.town || d.address.village || '' },
      }));
  }

  return (
    <div className="container max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Account aanmaken</h1>

      {/* OAuth (optioneel zichtbaar) */}
      {OAUTH_ENABLED && (
        <div className="mb-6 grid gap-3">
          <OAuthBtn onClick={() => signInOAuth("google")}>
            <IconGoogle />
            <span>Verder met Google</span>
          </OAuthBtn>
          <OAuthBtn onClick={() => signInOAuth("facebook")}>
            <IconFacebook />
            <span>Verder met Facebook</span>
          </OAuthBtn>
          {/* Apple registration removed */}
          <div className="text-center text-sm text-gray-500">
            of met e-mail & wachtwoord
          </div>
        </div>
      )}

      <form onSubmit={registerEmailPassword} className="grid gap-6">
        {ok && (
          <div className="rounded-xl border border-green-300 bg-green-50 text-green-700 p-3 text-sm">
            {ok} &nbsp;
            <button
              type="button"
              onClick={resendVerification}
              disabled={resendCooldown > 0 || !validateEmail(email)}
              className="underline font-medium disabled:opacity-60"
            >
              {resendCooldown > 0 ? `Opnieuw verzenden (${resendCooldown}s)` : 'Opnieuw verzenden'}
            </button>
          </div>
        )}
        {/* Account basis */}
        <section className="grid gap-3 rounded-2xl border border-gray-200 p-4">
          <h2 className="font-medium">Accountgegevens</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Voornaam</label>
              <input
                id="register-first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                data-testid="register-first-name"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Achternaam</label>
              <input
                id="register-last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                data-testid="register-last-name"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">E-mail</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Wachtwoord (min. 8 tekens)
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                data-testid="register-password"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Bevestig wachtwoord</label>
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                data-testid="register-confirm-password"
              />
            </div>
          </div>
        </section>

        {/* Contact & adres */}
        <section className="grid gap-3 rounded-2xl border border-gray-200 p-4">
          <h2 className="font-medium">Contact & adres</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Telefoon (optioneel)</label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Land</label>
              <input
                id="register-country"
                name="country"
                type="text"
                autoComplete="country"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">Straat</label>
              <Autocomplete
                id="register-street"
                name="street"
                autoComplete="address-line1"
                value={street}
                onChange={setStreet}
                fetchOptions={fetchStreetOptions}
                placeholder="Straatnaam"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Nr.</label>
              <input
                id="register-number"
                name="number"
                type="text"
                autoComplete="address-line2"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Bus (optioneel)</label>
              <input
                id="register-bus"
                name="bus"
                type="text"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                value={bus}
                onChange={(e) => setBus(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Postcode</label>
              <Autocomplete
                id="register-postal"
                name="postal"
                autoComplete="postal-code"
                value={postal}
                onChange={(v) => setPostal(v)}
                onPick={(opt) => {
                  const c = String(opt.meta?.city || '');
                  if (c) setCity(c);
                }}
                fetchOptions={fetchPostalOptions}
                placeholder="vb. 9000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Gemeente / Stad</label>
              <Autocomplete
                id="register-city"
                name="city"
                autoComplete="address-level2"
                value={city}
                onChange={(v) => setCity(v)}
                onPick={(opt) => {
                  const pc = String(opt.meta?.postcode || '');
                  if (pc) setPostal(pc);
                }}
                fetchOptions={fetchCityOptions}
                placeholder="vb. Gent"
              />
            </div>
          </div>
        </section>

        {/* Zakelijke verkoper */}
        <section className="grid gap-3 rounded-2xl border border-gray-200 p-4">
          <h2 className="font-medium">Zakelijke verkoper</h2>
          <label className="flex items-start gap-2 text-sm">
            <input
              id="register-is-business"
              name="isBusiness"
              type="checkbox"
              checked={isBusiness}
              onChange={(e) => setIsBusiness(e.target.checked)}
            />
            <span>
              Ik verkoop als <strong>zakelijke</strong> verkoper
            </span>
          </label>

          {isBusiness && (
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Bedrijfsnaam</label>
                <input
                  id="register-company-name"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={isBusiness}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  BTW-nummer (BE0123456789)
                </label>
                <input
                  id="register-vat"
                  name="vat"
                  type="text"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                  value={vat}
                  onChange={(e) => setVat(e.target.value.toUpperCase())}
                  placeholder="BE0XXXXXXXXX"
                />
                {vat && !looksLikeBEVAT(normalizeBEVAT(vat)) && (
                  <p className="text-sm text-red-500 mt-1">
                    Controleer het BTW-formaat.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Website (optioneel)
                </label>
                <input
                  id="register-website"
                  name="website"
                  type="url"
                  autoComplete="url"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">IBAN (optioneel)</label>
                <input
                  id="register-iban"
                  name="iban"
                  type="text"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="BE68 5390 0754 7034"
                />
                {iban && !looksLikeIBAN(iban) && (
                  <p className="text-sm text-red-500 mt-1">
                    IBAN lijkt ongeldig.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Toestemmingen */}
        <section className="grid gap-3 rounded-2xl border border-gray-200 p-4">
          <h2 className="font-medium">Toestemmingen</h2>
          <label className="flex items-start gap-2 text-sm">
            <input
              id="register-agree-terms"
              name="agreeTerms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              data-testid="register-agree-terms"
            />
            <span>
              Ik ga akkoord met de{" "}
              <Link href="/terms" className="underline">
                algemene voorwaarden
              </Link>{" "}
              en het{" "}
              <Link href="/privacy" className="underline">
                privacybeleid
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              id="register-marketing-opt-in"
              name="marketingOptIn"
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />
            <span>
              Ik ontvang graag updates & acties via e-mail (optioneel).
            </span>
          </label>
        </section>

        {/* Acties */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary text-black px-4 py-2 font-medium hover:opacity-90"
            data-testid="register-submit"
          >
            {loading ? "Bezig…" : "Account aanmaken"}
          </button>
          <Link href="/login" className="text-sm underline">
            Ik heb al een account
          </Link>
        </div>

        {/* ✅ Succesbericht */}
        {ok && <p className="text-green-600 text-sm">{ok}</p>}

        {/* 🔁 Altijd zichtbare 'verstuur opnieuw' zodra e-mail geldig is */}
        {validateEmail(email) && (
          <button
            type="button"
            disabled={resendCooldown > 0}
            onClick={async () => {
              if (resendCooldown > 0) return;
              const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: {
                  emailRedirectTo: `${siteUrl}/auth/callback`,
                },
              });
              if (error) {
                const lower = (error.message || '').toLowerCase();
                if (error.status === 429 || lower.includes('rate') || lower.includes('too many')) {
                  startResendCooldown(60);
                  alert('Te veel e-mails in korte tijd. Wacht 60 seconden en probeer opnieuw.');
                } else {
                  alert(`Kon mail niet opnieuw sturen: ${error.message}`);
                }
              } else {
                alert("Verificatiemail opnieuw verstuurd ✅");
                startResendCooldown(30);
              }
            }}
            className="text-sm underline mt-1 self-start"
          >
            {resendCooldown > 0 ? `Wacht ${resendCooldown}s…` : 'Geen mail ontvangen? Verstuur opnieuw'}
          </button>
        )}

        {/* ❌ Foutmelding */}
        {err && <p className="text-red-500 text-sm">{err}</p>}
      </form>
    </div>
  );
}
