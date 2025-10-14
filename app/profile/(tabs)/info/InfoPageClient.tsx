'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

import { ConsentModal } from '@/components/ConsentModal';
import { useToast } from '@/components/Toast';
import { type CookiePrefs, getCookiePrefs, updateCookiePrefs } from '@/lib/cookiePrefs';
import type { Profile } from '@/lib/profiletypes';
import { createClient } from '@/lib/supabaseClient';

/* ------------------------- helpers ------------------------- */
function splitName(full?: string) {
  const s = (full || '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

const emptyProfile: Profile = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  bio: '',
  address: { street: '', city: '', zip: '', country: 'België' },
  bank: { iban: '', bic: '' },
  preferences: { language: 'nl', newsletter: false, cookieConsent: undefined },
  notifications: { newMessages: true, bids: true, priceDrops: true, tips: true },
  business: {
    isBusiness: false,
    companyName: '',
    vatNumber: '',
    registrationNr: '',
    website: '',
    invoiceEmail: '',
    bank: { iban: '', bic: '' },
    invoiceAddress: { street: '', city: '', zip: '', country: 'België' },
    plan: 'basic',
    shopName: '',
    shopSlug: '',
    logoUrl: '',
    bannerUrl: '',
    description: '',
    socials: { instagram: '', facebook: '', tiktok: '' },
    public: { showEmail: false, showPhone: false },
    verified: false,
  },
};

/* ------------------------- page ------------------------- */
export default function InfoPageClient() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { push } = useToast();

  // Handle credits success without useSearchParams (no Suspense needed)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('credits_success') === 'true') {
      push('Credits succesvol toegevoegd! Je saldo is bijgewerkt.');
      window.dispatchEvent(new CustomEvent('ocaso:profile-updated', { detail: { refetch: true } }));
      const url = new URL(window.location.href);
      url.searchParams.delete('credits_success');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [push]);

  // Load profile
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfile(emptyProfile);
          setLoading(false);
          return;
        }
        let ui: Profile = { ...emptyProfile, id: user.id, email: user.email || '' };
        const { data: r } = await supabase
          .from('profiles')
          .select(`
            id, email, full_name, first_name, last_name, phone, avatar_url, bio,
            address, bank, preferences, notifications,
            is_business, company_name, vat, registration_nr, website, invoice_email,
            shop_name, shop_slug, business_logo_url, business_banner_url,
            business_bio, social_instagram, social_facebook, social_tiktok,
            public_show_email, public_show_phone, categories, business_plan
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (r) {
          const rec = r as Record<string, unknown>;
          const rf = rec['first_name'];
          const rl = rec['last_name'];
          const fn = typeof rf === 'string' ? rf : null;
          const ln = typeof rl === 'string' ? rl : null;
          const name = fn || ln ? { firstName: fn || '', lastName: ln || '' } : splitName(r.full_name);
          ui = {
            ...ui,
            firstName: name.firstName,
            lastName: name.lastName,
            email: r.email ?? user.email ?? '',
            phone: r.phone ?? '',
            avatarUrl: r.avatar_url ?? '',
            bio: r.bio ?? '',
            address: {
              street: r.address?.street ?? '',
              city: r.address?.city ?? '',
              zip: r.address?.zip ?? '',
              country: r.address?.country ?? 'België',
            },
            bank: { iban: (r as { bank?: { iban?: string; bic?: string } }).bank?.iban ?? '', bic: (r as { bank?: { iban?: string; bic?: string } }).bank?.bic ?? '' },
            preferences: {
              language: r.preferences?.language ?? 'nl',
              newsletter: r.preferences?.newsletter ?? false,
              cookieConsent: r.preferences?.cookieConsent ?? undefined,
            },
            notifications: {
              newMessages: r.notifications?.newMessages ?? true,
              bids: r.notifications?.bids ?? true,
              priceDrops: r.notifications?.priceDrops ?? true,
              tips: r.notifications?.tips ?? true,
            },
            business: {
              isBusiness: r.is_business ?? false,
              companyName: r.company_name ?? '',
              vatNumber: r.vat ?? '',
              registrationNr: r.registration_nr ?? '',
              website: r.website ?? '',
              invoiceEmail: r.invoice_email ?? '',
              bank: { iban: '', bic: '' },
              invoiceAddress: {
                street: '',
                city: '',
                zip: '',
                country: 'België',
              },
              plan: r.business_plan ?? 'basic',
              shopName: r.shop_name ?? '',
              shopSlug: r.shop_slug ?? '',
              logoUrl: r.business_logo_url ?? '',
              bannerUrl: r.business_banner_url ?? '',
              description: r.business_bio ?? '',
              socials: {
                instagram: r.social_instagram ?? '',
                facebook: r.social_facebook ?? '',
                tiktok: r.social_tiktok ?? '',
              },
              public: {
                showEmail: r.public_show_email ?? false,
                showPhone: r.public_show_phone ?? false,
              },
              categories: r.categories ?? [],
            },
          };
        }
        setProfile(ui);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Profiel laden mislukt:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Load cookie preferences client-side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCookiePrefs(getCookiePrefs());
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const dbPayload = {
        id: user.id,
        email: profile.email || null,
        phone: profile.phone || null,
        avatar_url: profile.avatarUrl || null,
        bio: profile.bio || null,
        address: {
          street: profile.address.street || '',
          city: profile.address.city || '',
          zip: profile.address.zip || '',
          country: profile.address.country || 'België',
        },
        bank: {
          iban: profile.bank?.iban || '',
          bic: profile.bank?.bic || '',
        },
        preferences: {
          ...(profile.preferences || { language: 'nl', newsletter: false }),
          cookieConsent: cookiePrefs ? { ...cookiePrefs } : profile.preferences.cookieConsent,
        },
        notifications: { ...(profile.notifications || { newMessages: true, bids: true, priceDrops: true, tips: true }) },
        first_name: (profile.firstName || '').trim() || null,
        last_name: (profile.lastName || '').trim() || null,
        full_name: [profile.firstName?.trim(), profile.lastName?.trim()].filter(Boolean).join(' '),
      } as const;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* noop */ }
      const r = await fetch('/api/profile/upsert', { method: 'PUT', headers, body: JSON.stringify(dbPayload) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const msg = d?.error || `Fout (${r.status})`;
        // eslint-disable-next-line no-console
        console.error('Profile upsert failed (server):', { status: r.status, body: d });
        try { push(`Opslaan mislukt: ${String(msg)}`); } catch { /* noop */ }
        try {
          // Fallback: client upsert (RLS must allow)
          const _supabase = createClient();
          const upsertRes: unknown = await _supabase.from('profiles').upsert(dbPayload as unknown);
          const upErr = (upsertRes && typeof upsertRes === 'object' && 'error' in upsertRes) ? (upsertRes as { error?: unknown }).error : null;
          if (upErr) throw upErr;
          const { data: fresh } = await _supabase
            .from('profiles')
            .select('id, full_name, first_name, last_name, email, phone, avatar_url, bio, address, bank, preferences, notifications')
            .eq('id', dbPayload.id)
            .maybeSingle();
          if (fresh) {
            const frec = fresh as Record<string, unknown>;
            const ff = frec['first_name'];
            const fl = frec['last_name'];
            const nm = (typeof ff === 'string' || typeof fl === 'string')
              ? { firstName: (typeof ff === 'string' ? ff : '') || '', lastName: (typeof fl === 'string' ? fl : '') || '' }
              : splitName(fresh.full_name || '');
            setProfile((p) => ({
              ...p,
              firstName: nm.firstName,
              lastName: nm.lastName,
              phone: fresh.phone || '',
              avatarUrl: fresh.avatar_url || p.avatarUrl,
              bio: fresh.bio || '',
              address: {
                street: fresh.address?.street || '',
                city: fresh.address?.city || '',
                zip: fresh.address?.zip || '',
                country: fresh.address?.country || 'België',
              },
              bank: { iban: (fresh as { bank?: { iban?: string; bic?: string } }).bank?.iban || '', bic: (fresh as { bank?: { iban?: string; bic?: string } }).bank?.bic || '' },
              preferences: {
                language: fresh.preferences?.language || (p.preferences?.language || 'nl'),
                newsletter: !!fresh.preferences?.newsletter,
                cookieConsent: fresh.preferences?.cookieConsent ?? p.preferences?.cookieConsent,
              },
              notifications: {
                newMessages: fresh.notifications?.newMessages ?? true,
                bids: fresh.notifications?.bids ?? true,
                priceDrops: fresh.notifications?.priceDrops ?? true,
                tips: fresh.notifications?.tips ?? true,
              },
            } as Profile));
          }
          push('Profiel opgeslagen (fallback)');
          setSaving(false);
          return;
        } catch (fbErr: unknown) {
          let m = String(fbErr);
          if (fbErr && typeof fbErr === 'object' && 'message' in fbErr && typeof (fbErr as { message?: unknown }).message === 'string') {
            m = (fbErr as { message?: string }).message as string;
          }
          throw new Error(`${msg} — fallback mislukte: ${m}`);
        }
      }
  const resp = await r.json().catch(() => ({} as { profile?: {
        full_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        bio?: string | null;
        address?: { street?: string; city?: string; zip?: string; country?: string } | null;
        bank?: { iban?: string; bic?: string } | null;
        preferences?: { language?: string; newsletter?: boolean; cookieConsent?: unknown } | null;
        notifications?: { newMessages?: boolean; bids?: boolean; priceDrops?: boolean; tips?: boolean } | null;
      } }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ocaso:profile-updated', { detail: { profile: resp?.profile || dbPayload } }));
      }
      try {
        const row = resp?.profile;
        if (row && typeof row === 'object') {
          const rrec = row as Record<string, unknown>;
          const rf = rrec['first_name'];
          const rl = rrec['last_name'];
          const nm = (typeof rf === 'string' || typeof rl === 'string')
            ? { firstName: (typeof rf === 'string' ? rf : '') || '', lastName: (typeof rl === 'string' ? rl : '') || '' }
            : splitName(row.full_name || '');
          setProfile((p) => ({
            ...p,
            firstName: nm.firstName,
            lastName: nm.lastName,
            phone: row.phone || '',
            avatarUrl: row.avatar_url || p.avatarUrl,
            bio: row.bio || '',
            address: {
              street: row.address?.street || '',
              city: row.address?.city || '',
              zip: row.address?.zip || '',
              country: row.address?.country || 'België',
            },
            bank: { iban: (row as { bank?: { iban?: string; bic?: string } }).bank?.iban || '', bic: (row as { bank?: { iban?: string; bic?: string } }).bank?.bic || '' },
            preferences: {
              language: row.preferences?.language || (p.preferences?.language || 'nl'),
              newsletter: !!row.preferences?.newsletter,
              cookieConsent: row.preferences?.cookieConsent ?? p.preferences?.cookieConsent,
            },
            notifications: {
              newMessages: row.notifications?.newMessages ?? true,
              bids: row.notifications?.bids ?? true,
              priceDrops: row.notifications?.priceDrops ?? true,
              tips: row.notifications?.tips ?? true,
            },
            business: p.business,
          } as Profile));
        }
      } catch { /* noop */ }
      push('Profiel opgeslagen');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Opslaan mislukt:', e);
      push('Opslaan mislukt. Controleer je invoer en probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFiles(files: File[]) {
    if (!files?.length) return;
    const file = files[0];
    setUploadError(null);
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error as Error;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(data.path);
      const url = pub.publicUrl;
      setProfile(p => ({ ...p, avatarUrl: url }));
      try {
        const { data: updated, error: updErr } = await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('id', user.id)
          .select('avatar_url')
          .single();
        if (updErr) {
          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert({ id: user.id, avatar_url: url });
          if (upsertErr) throw upsertErr;
        } else if (updated?.avatar_url) {
          setProfile((p) => ({ ...p, avatarUrl: updated.avatar_url as string }));
        }
      } catch (e: unknown) {
        let msg = 'onbekende fout';
        if (typeof e === 'string') msg = e;
        else if (e && typeof e === 'object') {
          const maybe = e as { message?: string; details?: string };
          if (typeof maybe.message === 'string') {
            msg = maybe.details ? `${maybe.message} (${maybe.details})` : maybe.message;
          }
        }
        setUploadError(`Upload gelukt, maar opslaan in profiel mislukte: ${msg}`);
        // eslint-disable-next-line no-console
        console.error('Avatar update -> profiel opslaan fout', e);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ocaso:profile-updated', { detail: { avatarUrl: url } }));
      }
    } catch (e) {
      const msg = (e instanceof Error && e.message) ? e.message : 'Upload mislukt';
      setUploadError(msg);
    } finally {
      setUploadingAvatar(false);
    }
  }

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) handleAvatarFiles(files);
    e.currentTarget.value = '';
  }

  const initials = (() => {
    const a = (profile.firstName || '').trim().charAt(0).toUpperCase();
    const b = (profile.lastName || '').trim().charAt(0).toUpperCase();
    const both = `${a}${b}`.trim();
    if (both) return both;
    const c = (profile.email || '').trim().charAt(0).toUpperCase();
    return c || 'U';
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <header className="relative border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="relative">
              {profile.avatarUrl ? (
                <div className="relative h-16 w-16 md:h-20 md:w-20">
                  <Image
                    src={profile.avatarUrl}
                    alt="avatar"
                    fill
                    sizes="80px"
                    className="rounded-2xl border border-emerald-100 object-cover shadow-sm"
                    priority={false}
                  />
                </div>
              ) : (
                <div
                  aria-label="Geen profielfoto"
                  className="h-16 w-16 md:h-20 md:w-20 rounded-2xl border border-emerald-100 shadow-sm grid place-items-center bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-300 text-emerald-900"
                >
                  <span className="select-none text-sm font-semibold md:text-base tracking-wide">
                    {initials}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 rounded-full border bg-white/90 px-2 py-1 text-[10px] font-semibold shadow-sm backdrop-blur hover:bg-white disabled:opacity-60"
                aria-label="Wijzig profielfoto"
                title="Wijzig profielfoto"
              >
                {uploadingAvatar ? 'Bezig…' : 'Wijzig'}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Profiel</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Mijn gegevens</h1>
              {profile.business?.verified && (
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-sm font-semibold border border-emerald-100">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    Geverifieerde gebruiker
                  </span>
                </div>
              )}
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Alles wat je bij de registratie invulde, overzichtelijk in één plaats. Werk je gegevens bij en sla op.
              </p>
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>

            <div className="ms-auto">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {loading ? (
          <div className="space-y-6">
            <SkeletonCard h={90} />
            <SkeletonCard h={220} />
            <SkeletonCard h={220} />
          </div>
        ) : !profile.id ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-600">Je bent niet aangemeld.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <Section
              overline="Sectie"
              title="Persoonsgegevens"
              subtitle="Basisinfo die we gebruiken voor je account en communicatie."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Voornaam">
                  <Input
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </Field>
                <Field label="Achternaam">
                  <Input
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </Field>
                <Field label="E-mail (login)">
                  <Input value={profile.email} disabled />
                </Field>
                <Field label="Telefoon">
                  <Input
                    placeholder="+32 4xx xx xx xx"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-5">
                <Field label="Korte bio (optioneel)">
                  <Textarea
                    rows={3}
                    placeholder="Vertel iets over jezelf (max. 200 tekens)…"
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </Field>
              </div>
            </Section>

            <Section
              overline="Cookies"
              title="Cookie verplichtingen"
              subtitle="Overzicht van categorieën en je keuze-opties. Dit is een samenvatting; volledig beleid vind je op de cookiepagina."
              defaultCollapsed={true}
            >
              <div className="space-y-4 text-sm text-neutral-700">
                <div className="grid gap-4 md:grid-cols-2">
                  <CookieCategory
                    name="Essentieel"
                    purpose="Nodig voor beveiliging, sessies en basisfunctionaliteit. Altijd actief."
                    examples="Sessies, CSRF-token"
                    retention="Sessie / tot 1 jaar"
                    locked
                  />
                  <CookieCategory
                    name="Functioneel"
                    purpose="Onthoudt jouw voorkeuren (taal, UI)."
                    examples="Taal, interface instellingen"
                    retention="Tot 12 maanden"
                    togglable
                    enabled={!!cookiePrefs?.functional}
                    onToggle={(v) => setCookiePrefs(updateCookiePrefs({ functional: v }))}
                  />
                  <CookieCategory
                    name="Analytisch"
                    purpose="Helpt ons prestaties en gebruik te begrijpen. Geanonimiseerd."
                    examples="Plausible, geanonimiseerde events"
                    retention="6–24 maanden"
                    togglable
                    enabled={!!cookiePrefs?.analytics}
                    onToggle={(v) => setCookiePrefs(updateCookiePrefs({ analytics: v }))}
                  />
                  <CookieCategory
                    name="Marketing"
                    purpose="Relevantere promoties & metingen."
                    examples="Meta Pixel, Ads tags"
                    retention="Tot 24 maanden"
                    togglable
                    enabled={!!cookiePrefs?.marketing}
                    onToggle={(v) => setCookiePrefs(updateCookiePrefs({ marketing: v }))}
                  />
                </div>
                <p className="text-sm text-neutral-500">* Bepaalde essentiële cookies kunnen langer bewaard blijven voor beveiliging en fraudepreventie.</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                    onClick={() => window.open('/cookies', '_blank')}
                  >
                    Volledig cookiebeleid
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110"
                    onClick={() => setShowConsent(true)}
                  >
                    Open cookievoorkeuren
                  </button>
                </div>
              </div>
            </Section>

            <Section
              overline="Adres"
              title="Facturatie & verzending"
              subtitle="Wordt gebruikt voor leveringen, ophalen en facturatie."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Straat + nr.">
                  <Input
                    value={profile.address.street}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, street: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Postcode">
                  <Input
                    value={profile.address.zip}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, zip: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Gemeente / Stad">
                  <Input
                    value={profile.address.city}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, city: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Land">
                  <Input
                    value={profile.address.country}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, country: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="IBAN (voor QR-overschrijving)">
                  <Input
                    placeholder="BE68 5390 0754 7034"
                    value={profile.bank?.iban || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, bank: { ...(p.bank || { iban: '', bic: '' }), iban: e.target.value } }))}
                  />
                </Field>
                <Field label="BIC (optioneel)">
                  <Input
                    placeholder="KREDBEBB"
                    value={profile.bank?.bic || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, bank: { ...(p.bank || { iban: '', bic: '' }), bic: e.target.value } }))}
                  />
                </Field>
              </div>

            </Section>

            <Section
              overline="Voorkeuren"
              title="Taal & e-mailupdates"
              subtitle="Kies je weergavetaal en of je nieuwsbrieven wil ontvangen."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Taal">
                  <Select
                    value={profile.preferences.language}
                    onChange={(v: string) =>
                      setProfile({
                        ...profile,
                        preferences: { ...profile.preferences, language: v },
                      })
                    }
                    options={[
                      { value: 'nl', label: 'Nederlands' },
                      { value: 'fr', label: 'Français' },
                      { value: 'en', label: 'English' },
                      { value: 'de', label: 'Deutsch' },
                    ]}
                  />
                </Field>
                <Field label="Nieuwsbrief">
                  <label className="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={!!profile.preferences.newsletter}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          preferences: {
                            ...profile.preferences,
                            newsletter: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="text-sm text-neutral-700">
                      Ja, ik ontvang tips & updates van OCASO
                    </span>
                  </label>
                </Field>
              </div>
            </Section>

            <Section
              overline="Notificaties"
              title="Meldingen & activiteiten"
              subtitle="Beheer welke meldingen je per e-mail ontvangt."
              defaultCollapsed={true}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <NotificationToggle
                  label="Nieuwe berichten"
                  description="Ontvang een melding wanneer je een nieuw chatbericht krijgt."
                  checked={!!profile.notifications.newMessages}
                  onChange={(v) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, newMessages: v },
                  })}
                />
                <NotificationToggle
                  label="Biedingen"
                  description="Wanneer iemand biedt op jouw zoekertje."
                  checked={!!profile.notifications.bids}
                  onChange={(v) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, bids: v },
                  })}
                />
                <NotificationToggle
                  label="Prijsdalingen"
                  description="Updates over prijswijzigingen van gevolgde items."
                  checked={!!profile.notifications.priceDrops}
                  onChange={(v) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, priceDrops: v },
                  })}
                />
                <NotificationToggle
                  label="Tips & nieuws"
                  description="Productupdates, platformtips en inspiratie."
                  checked={!!profile.notifications.tips}
                  onChange={(v) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, tips: v },
                  })}
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
            </Section>

            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        )}
      </main>
      <ConsentModal open={showConsent} onClose={() => setShowConsent(false)} />
    </div>
  );
}

/* ------------------------- atoms ------------------------- */
function Section({
  overline,
  title,
  subtitle,
  children,
  collapsible = true,
  defaultCollapsed = true,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  function toggle() {
    if (!collapsible) return;
    setCollapsed(c => !c);
  }
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6 pb-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className={`group flex w-full items-start gap-4 text-left ${collapsible ? 'cursor-pointer' : ''}`}
        >
          <div className="flex-1">
            {overline ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                {overline}
              </div>
            ) : null}
            <h2 className="mt-1 text-xl font-semibold tracking-tight flex items-center gap-2">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
            ) : null}
            <div className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
          </div>
          {collapsible && (
            <span
              className={`mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition group-hover:bg-neutral-50 ${collapsed ? '' : 'rotate-90'}`}
              aria-hidden="true"
            >
              <svg
                className="h-4 w-4 transition-transform"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 5l6 5-6 5" />
              </svg>
            </span>
          )}
        </button>
      </div>
      <div className={`grid gap-4 px-6 pb-6 transition-[height] ${collapsed ? 'hidden' : ''}`}>{children}</div>
    </section>
  );
}

function SkeletonCard({ h = 180 }: { h?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-10 w-full bg-neutral-50" />
      <div className="p-6">
        <div className="h-4 w-40 rounded bg-neutral-100" />
        <div className="mt-4 h-[1px] w-full bg-neutral-100" />
        <div className="mt-4" style={{ height: h }}>
          <div className="h-full w-full rounded bg-neutral-50" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition
                  placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition
                  placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-emerald-200"
    >
      <option value="" disabled>
        Maak een keuze…
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 flex-none accent-emerald-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="block">
        <span className="block text-sm font-medium leading-snug">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-neutral-600">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function CookieCategory({
  name,
  purpose,
  examples,
  retention,
  locked = false,
  togglable = false,
  enabled = false,
  onToggle,
}: {
  name: string;
  purpose: string;
  examples: string;
  retention: string;
  locked?: boolean;
  togglable?: boolean;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            {name}
            {locked && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">vast</span>}
          </div>
          <p className="mt-1 text-neutral-600 leading-snug">{purpose}</p>
          <p className="mt-2 text-sm text-neutral-500"><span className="font-medium">Voorbeelden:</span> {examples}</p>
          <p className="mt-1 text-sm text-neutral-500"><span className="font-medium">Bewaartermijn:</span> {retention}</p>
        </div>
        {togglable && !locked && (
          <label className="ms-auto inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={enabled}
              onChange={(e) => onToggle?.(e.target.checked)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
