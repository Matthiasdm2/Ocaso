'use client';

import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import KycForm from '@/components/KycForm';
import { CATEGORIES } from '@/lib/categories';
import type { BillingCycle, BusinessPlan, Profile } from '@/lib/profiletypes';
import { createClient } from '@/lib/supabaseClient';
// Nieuwe API integratie voor business update

// Type for business subscription data from database
interface BusinessSubscriptionData {
  plan?: string;
  billing_cycle?: string;
  subscription_active?: boolean;
  subscription_updated_at?: string;
}
function splitName(full?: string) {
  const s = (full || '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(' ');
  return { firstName: parts[0] || '', lastName: parts.length > 1 ? parts.slice(1).join(' ') : '' };
}
function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
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
  preferences: { language: 'nl', newsletter: false },
  notifications: { newMessages: true, bids: true, priceDrops: true, tips: true },
  business: {
    isBusiness: true, // deze pagina is voor zakelijke verkopers
    companyName: '',
    vatNumber: '',
    registrationNr: '',
    website: '',
    invoiceEmail: '',
    bank: { iban: '', bic: '' },
    invoiceAddress: { firstName: '', lastName: '', street: '', city: '', zip: '', country: 'België' },
    plan: 'basic',
    billingCycle: 'monthly',
    subscriptionActive: false,
    shopName: '',
    shopSlug: '',
    logoUrl: '',
    bannerUrl: '',
    description: '',
    socials: { instagram: '', facebook: '', tiktok: '' },
    public: { showEmail: false, showPhone: false },
    categories: [],
  },
};

/* --------------------------------- page ---------------------------------- */
export default function BusinessProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState<null | 'ok' | 'taken' | 'err'>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  // BTW verificatie state
  const [vatVerificationStatus, setVatVerificationStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [vatVerificationMessage, setVatVerificationMessage] = useState<string>('');

  // NEW: modal state voor preview
  const [showPreview, setShowPreview] = useState(false);
  // Abonnement: keuze maand/jaar (vaste jaarlijkse prijzen)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  // Stripe KYC status
  const [stripeStatus, setStripeStatus] = useState<{
    status: 'not_onboarded' | 'incomplete' | 'pending' | 'approved' | 'rejected';
    message: string;
  } | null>(null);

  const searchParams = useSearchParams();
  const openSection = searchParams.get('open');
  const checkoutSuccess = searchParams.get('success') === 'true';
  const _checkoutPlan = searchParams.get('plan');
  const _checkoutBilling = searchParams.get('billing');
  console.log('openSection:', openSection);

  // Scroll to section if specified
  useEffect(() => {
    if (openSection === 'betaalterminal') {
      // Small delay to ensure the component is rendered and expanded
      setTimeout(() => {
        const element = document.getElementById('betaalterminal');
        console.log('Scrolling to betaalterminal, element found:', element);
        if (element) {
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const top = rect.top + scrollTop - 100; // 100px offset from top
          window.scrollTo({ top, behavior: 'smooth' });
          console.log('Scrolled to top:', top);
        } else {
          console.log('Element not found');
        }
      }, 500); // Increased delay
    }
  }, [openSection]);

  // Houd profiel's billingCycle in sync wanneer profiel geladen wordt
  useEffect(() => {
    try {
      const bc = profile?.business?.billingCycle as BillingCycle | undefined;
      if (bc) setBillingCycle(bc);
    } catch (e) {
      // noop
    }
  }, [profile?.business?.billingCycle]);

  // Ververs profiel na succesvolle checkout om nieuwe subscription data te laden
  useEffect(() => {
    if (checkoutSuccess) {
      // Wacht even voor webhook processing en laad profiel opnieuw
      const timer = setTimeout(async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: r } = await supabase
            .from('profiles')
            .select(`
              id, email, full_name, phone,
              is_business, company_name, vat, registration_nr, website, invoice_email,
              bank, invoice_address,
              shop_name, shop_slug,
              business_logo_url, business_banner_url,
              business_bio,
              social_instagram, social_facebook, social_tiktok,
              public_show_email, public_show_phone,
              business
            `)
            .eq('id', user.id)
            .maybeSingle();

          if (r) {
            const name = splitName(r.full_name);
            const ui: Profile = {
              ...profile,
              firstName: name.firstName,
              lastName: name.lastName,
              email: r.email ?? user.email ?? '',
              phone: r.phone ?? '',
              business: {
                ...profile.business,
                isBusiness: !!r.is_business,
                companyName: r.company_name ?? '',
                vatNumber: r.vat ?? '',
                registrationNr: r.registration_nr ?? '',
                website: r.website ?? '',
                invoiceEmail: r.invoice_email ?? '',
                bank: { iban: r.bank?.iban ?? '', bic: r.bank?.bic ?? '' },
                invoiceAddress: {
                  firstName: r.invoice_address?.firstName ?? '',
                  lastName: r.invoice_address?.lastName ?? '',
                  street: r.invoice_address?.street ?? '',
                  city: r.invoice_address?.city ?? '',
                  zip: r.invoice_address?.zip ?? '',
                  country: r.invoice_address?.country ?? 'België',
                },
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
                  showEmail: !!r.public_show_email,
                  showPhone: !!r.public_show_phone,
                },
                // Business subscription data
                plan: ((r.business as BusinessSubscriptionData)?.plan as BusinessPlan) ?? 'basic',
                billingCycle: ((r.business as BusinessSubscriptionData)?.billing_cycle as BillingCycle) ?? 'monthly',
                subscriptionActive: (r.business as BusinessSubscriptionData)?.subscription_active ?? false,
                subscriptionUpdatedAt: (r.business as BusinessSubscriptionData)?.subscription_updated_at,
              },
            };
            setProfile(ui);
          }
        } catch (e) {
          console.error('Profiel verversen na checkout mislukt:', e);
        } finally {
          setLoading(false);
        }
      }, 2000); // 2 second delay voor webhook processing

      return () => clearTimeout(timer);
    }
  }, [checkoutSuccess, supabase, profile]);

  // Helper: euro weergave
  function fmtEUR(v: number) {
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  // Basisprijzen per maand
  const MONTHLY_PRICES: Record<string, number> = { basic: 15, pro: 25 };
  const YEARLY_PRICES: Record<string, number> = { basic: 150, pro: 240 };

  // Externe Stripe-betaallinks verwijderd; gebruik de embedded checkout pagina

  // Load huidige gebruiker + profiel
  useEffect(() => {
    console.log('BusinessProfilePage component mounted');
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      let ui: Profile = { ...emptyProfile, id: user.id, email: user.email || '' };

      try {
        const { data: r } = await supabase
          .from('profiles')
          .select(`
            id, email, full_name, phone,
            is_business, company_name, vat, registration_nr, website, invoice_email,
            bank, invoice_address,
            shop_name, shop_slug,
            business_logo_url, business_banner_url,
            business_bio,
            social_instagram, social_facebook, social_tiktok,
            public_show_email, public_show_phone,
            business
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (r) {
          const name = splitName(r.full_name);
          ui = {
            ...ui,
            firstName: name.firstName,
            lastName: name.lastName,
            email: r.email ?? user.email ?? '',
            phone: r.phone ?? '',
            business: {
              ...ui.business,
              isBusiness: !!r.is_business,
              companyName: r.company_name ?? '',
              vatNumber: r.vat ?? '',
              registrationNr: r.registration_nr ?? '',
              website: r.website ?? '',
              invoiceEmail: r.invoice_email ?? '',
              bank: { iban: r.bank?.iban ?? '', bic: r.bank?.bic ?? '' },
              invoiceAddress: {
                firstName: r.invoice_address?.firstName ?? '',
                lastName: r.invoice_address?.lastName ?? '',
                street: r.invoice_address?.street ?? '',
                city: r.invoice_address?.city ?? '',
                zip: r.invoice_address?.zip ?? '',
                country: r.invoice_address?.country ?? 'België',
              },
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
              // categories (optioneel kolom)
              ...(() => {
                const rawCats = (r as Record<string, unknown>)?.categories;
                if (Array.isArray(rawCats)) {
                  const cleaned = rawCats.filter((c): c is string => typeof c === 'string').slice(0,8);
                  return { categories: cleaned };
                }
                return {};
              })(),
              public: {
                showEmail: !!r.public_show_email,
                showPhone: !!r.public_show_phone,
              },
              // Business subscription data
              plan: ((r.business as BusinessSubscriptionData)?.plan as BusinessPlan) ?? 'basic',
              billingCycle: ((r.business as BusinessSubscriptionData)?.billing_cycle as BillingCycle) ?? 'monthly',
              subscriptionActive: (r.business as BusinessSubscriptionData)?.subscription_active ?? false,
              subscriptionUpdatedAt: (r.business as BusinessSubscriptionData)?.subscription_updated_at,
            },
          };
        }
      } catch (e) {
        console.error('Business-profiel laden mislukt:', e);
      }

      setProfile(ui);
      setLoading(false);
    })();
  }, [supabase]);

  // Load Stripe KYC status
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch('/api/stripe/custom/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStripeStatus(data);
        }
      } catch (e) {
        console.error('Stripe status laden mislukt:', e);
      }
    })();
  }, [supabase]);

  // Client-side validatie
  function validate(): string | null {
    const b = profile.business;
    if (!b.shopName.trim()) return 'Shopnaam is verplicht';
    if (b.shopSlug && b.shopSlug.length < 3) return 'Slug minimaal 3 tekens';
    if (b.shopSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.shopSlug)) return 'Slug bevat ongeldige tekens';
    if (b.website && b.website.length > 0) {
      try { new URL(b.website.startsWith('http') ? b.website : 'https://' + b.website); } catch { return 'Website URL ongeldig'; }
    }
    return null;
  }

  // Opslaan via nieuwe API route
  async function save() {
    setFormError(null); setFormOk(null);
    const vErr = validate();
    if (vErr) { setFormError(vErr); return; }
    setSaving(true);
    try {
      const body = {
        companyName: profile.business.companyName || undefined,
        vatNumber: profile.business.vatNumber || undefined,
        registrationNr: profile.business.registrationNr || undefined,
        website: profile.business.website || undefined,
        invoiceEmail: profile.business.invoiceEmail || undefined,
        shopName: profile.business.shopName || undefined,
        shopSlug: profile.business.shopSlug || undefined,
        description: profile.business.description || undefined,
        socials: profile.business.socials,
        public: profile.business.public,
        logoUrl: profile.business.logoUrl || undefined,
        bannerUrl: profile.business.bannerUrl || undefined,
  categories: profile.business.categories && profile.business.categories.length ? profile.business.categories : undefined,
      };
      const r = await fetch('/api/profile/business', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'Server fout');
      }
      setFormOk('Opgeslagen');
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ocaso:profile-updated'));
    } catch (e) {
      console.error(e);
      setFormError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setSaving(false);
    }
  }

  // Uploads (logo & banner)
  async function uploadTo(bucket: string, file: File, setUrl: (u: string | null) => void) {
    // Basis validaties
    if (!file) return Promise.reject(new Error('Geen bestand geselecteerd'));
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) return Promise.reject(new Error('Bestand te groot (max 2MB)'));
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('Alleen afbeeldingen toegestaan'));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Promise.reject(new Error('Niet ingelogd'));

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    // Probeer uploaden
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      // Specifiekere fouten proberen te herkennen
      const msg = uploadError.message || '';
      if (/Invalid storage bucket/i.test(msg) || /Not Found/i.test(msg)) {
        throw new Error(`Bucket '${bucket}' ontbreekt. Maak deze aan in Supabase Storage.`);
      }
      if (/Row Level Security/i.test(msg) || /permission denied/i.test(msg)) {
        throw new Error('Geen permissie voor upload (RLS / policies controleren)');
      }
      throw new Error('Upload mislukt: ' + msg);
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.publicUrl || null;
    if (!publicUrl) throw new Error('Kon publieke URL niet verkrijgen');
    setUrl(publicUrl);

    // Persist direct naar profiel
    const columnUpdate = bucket === 'business-logos'
      ? { business_logo_url: publicUrl }
      : bucket === 'business-covers'
        ? { business_banner_url: publicUrl }
        : null;
    if (columnUpdate) {
      const { error: updateError } = await supabase.from('profiles').update(columnUpdate).eq('id', user.id);
      if (updateError) {
        // Niet blokkeren, maar melden
        // eslint-disable-next-line no-console
        console.warn('Media URL geüpload maar DB update faalde', updateError);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ocaso:profile-updated', { detail: { business: columnUpdate } }));
      }
    }
  }

  // Slug validatie
  const checkSlug = useRef<number | null>(null);
  function onShopNameChange(v: string) {
    const nextSlug = profile.business.shopSlug ? profile.business.shopSlug : slugify(v);
    setProfile(p => ({ ...p, business: { ...p.business, shopName: v, shopSlug: nextSlug } }));
    setCheckingSlug(null);
  }
  function onShopSlugChange(v: string) {
    const s = slugify(v);
    setProfile(p => ({ ...p, business: { ...p.business, shopSlug: s } }));
    setCheckingSlug(null);
    if (checkSlug.current) clearTimeout(checkSlug.current);
    checkSlug.current = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/business/slug-available?slug=${encodeURIComponent(s)}`);
        if (!r.ok) { setCheckingSlug(null); return; }
        const d = await r.json();
        setCheckingSlug(d?.available ? 'ok' : 'taken');
      } catch {
        setCheckingSlug('err');
      }
    }, 500);
  }

  // BTW verificatie functie
  const verifyVatNumber = useCallback(async (vatNumber: string) => {

    if (!vatNumber.trim()) {
      setVatVerificationStatus('idle');
      setVatVerificationMessage('');
      return;
    }

    setVatVerificationStatus('verifying');
    setVatVerificationMessage('BTW nummer controleren...');

    try {
      const res = await fetch('/api/vies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vatNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVatVerificationStatus('invalid');
        setVatVerificationMessage(data.error || 'Verificatie mislukt');
        return;
      }

      setVatVerificationStatus('valid');
      setVatVerificationMessage(`✓ Geldig BTW nummer${data.name ? ` - ${data.name}` : ''}`);
    } catch (error) {
      console.error('VAT verification error:', error);
      setVatVerificationStatus('invalid');
      setVatVerificationMessage('Kon BTW nummer niet verifiëren');
    }
  }, []);

  const verified = useMemo(() => {
    const b = profile.business;
    // Basis verificatie: alle velden ingevuld EN BTW nummer geverifieerd
    return !!(b.vatNumber && b.registrationNr && b.companyName && vatVerificationStatus === 'valid');
  }, [profile.business, vatVerificationStatus]);

  // Onmiddellijke BTW verificatie
  useEffect(() => {
    if (profile.business.vatNumber.trim()) {
      verifyVatNumber(profile.business.vatNumber);
    } else {
      setVatVerificationStatus('idle');
      setVatVerificationMessage('');
    }
  }, [profile.business.vatNumber, verifyVatNumber]);

  const refreshStripeStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/stripe/custom/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      }
    } catch (e) {
      console.error('Stripe status refresh mislukt:', e);
    }
  };

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      {/* HERO */}
      <header className="relative border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Profiel</p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Zakelijk profiel</h1>
              <p className="max-w-2xl text-sm text-neutral-600">
                Ontwerp jouw publieke winkelpagina. Deze info is zichtbaar voor kopers op OCASO.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              >
                Preview zakelijk profiel
              </button>
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

      {/* CONTENT */}
      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {loading ? (
          <div className="space-y-6">
            <SkeletonCard h={120} />
            <SkeletonCard h={280} />
            <SkeletonCard h={260} />
            <SkeletonCard h={200} />
          </div>
        ) : !profile.id ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Je bent niet aangemeld.</div>
        ) : (
          <div className="space-y-10">
            {checkoutSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 text-emerald-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div className="font-semibold">Abonnement geactiveerd</div>
                  <div className="text-sm">
                    Je betaling is voltooid. Je {_checkoutPlan ? `${_checkoutPlan.charAt(0).toUpperCase() + _checkoutPlan.slice(1)}` : 'zakelijke'} abonnement{_checkoutBilling ? ` (${_checkoutBilling === 'yearly' ? 'jaarlijks' : 'maandelijks'})` : ''} is nu actief.
                  </div>
                </div>
              </div>
            )}
            {/* Abonnement keuze - verberg alleen als er een actief abonnement is en geen recente checkout */}
            {!(profile.business?.subscriptionActive && !checkoutSuccess) && (
              <Section overline="Abonnement" title="Kies je abonnement" subtitle="Selecteer een pakket voor je zakelijke profiel." collapsible={true} defaultCollapsed={true}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-neutral-600">Betaling</div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm">Maandelijks</div>
                    <button
                      onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
                      aria-pressed={billingCycle === 'yearly'}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${billingCycle === 'yearly' ? 'bg-emerald-600' : 'bg-neutral-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div className="text-sm">Jaarlijks</div>
                  </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                {/* Basis abonnement */}
                <div className="rounded-3xl border bg-white shadow-lg p-8 flex flex-col items-center gap-4 transition hover:scale-[1.02] hover:shadow-xl">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-2">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-700 mb-1">Basis</h3>
                  <div className="text-3xl font-extrabold text-emerald-700 mb-2">
                    {billingCycle === 'monthly' ? (
                      <>{fmtEUR(MONTHLY_PRICES.basic)}<span className="text-lg font-normal text-neutral-600">/maand</span></>
                    ) : (
                      <>{fmtEUR(YEARLY_PRICES.basic)}<span className="text-lg font-normal text-neutral-600">/jaar</span></>
                    )}
                  </div>
                  <p className="text-base text-neutral-600 mb-2 text-center">Voor bedrijven die willen starten op OCASO. Inclusief alle standaard functionaliteiten.</p>
                  <ul className="mb-4 flex flex-col gap-2 items-center w-full">
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Eigen winkelpagina</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Maximaal 25 actieve zoekertjes</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Support via e-mail</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Statistieken over je verkopen</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Integratie met externe tools</li>
                  </ul>
                  <div className="mb-4 text-sm text-neutral-500 text-center w-full">{billingCycle === 'monthly' ? 'Maandelijks opzegbaar' : ''}</div>
                  <div className="mt-auto w-full flex justify-center">
                    {profile.business?.plan === 'basic' && profile.business?.subscriptionActive ? (
                      <div className="rounded-xl bg-neutral-100 px-6 py-3 text-base font-semibold text-neutral-600">
                        Huidig actief
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const url = `/checkout/embedded?plan=basic&billing=${billingCycle}`;
                          window.location.href = url;
                        }}
                        className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700"
                      >
                        Activeer
                      </button>
                    )}
                  </div>
                </div>
                {/* Pro abonnement */}
                <div className="rounded-3xl border bg-white shadow-lg p-8 flex flex-col items-center gap-4 transition hover:scale-[1.02] hover:shadow-xl">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-2">
                    <svg className="w-8 h-8 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-700 mb-1">Pro</h3>
                  <div className="text-3xl font-extrabold text-emerald-700 mb-2">
                    {billingCycle === 'monthly' ? (
                      <>{fmtEUR(MONTHLY_PRICES.pro)}<span className="text-lg font-normal text-neutral-600">/maand</span></>
                    ) : (
                      <>{fmtEUR(YEARLY_PRICES.pro)}<span className="text-lg font-normal text-neutral-600">/jaar</span></>
                    )}
                  </div>
                  <p className="text-base text-neutral-600 mb-2 text-center">Voor bedrijven die onbeperkt willen groeien op OCASO. Inclusief alle standaard functionaliteiten.</p>
                  <ul className="mb-4 flex flex-col gap-2 items-center w-full">
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Eigen winkelpagina</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Onbeperkt aantal actieve zoekertjes</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Support via e-mail</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Statistieken over je verkopen</li>
                    <li className="flex items-center gap-2 text-base text-neutral-700"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100"><svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>Integratie met externe tools</li>
                  </ul>
                  <div className="mb-4 text-sm text-neutral-500 text-center w-full">{billingCycle === 'monthly' ? 'Maandelijks opzegbaar' : ''}</div>
                  <div className="mt-auto w-full flex justify-center">
                    {profile.business?.plan === 'pro' && profile.business?.subscriptionActive ? (
                      <div className="rounded-xl bg-neutral-100 px-6 py-3 text-base font-semibold text-neutral-600">
                        Huidig actief
                      </div>
                    ) : profile.business?.plan === 'basic' && profile.business?.subscriptionActive ? (
                      <button
                        onClick={() => {
                          const url = `/checkout/embedded?plan=pro&billing=${billingCycle}`;
                          window.location.href = url;
                        }}
                        className="rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-800"
                      >
                        Upgraden naar Pro
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const url = `/checkout/embedded?plan=pro&billing=${billingCycle}`;
                          window.location.href = url;
                        }}
                        className="rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-800"
                      >
                        Activeer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Section>
            )}
            {/* Branding */}
            <Section overline="Branding" title="Logo & banner" subtitle="Upload je bedrijfslogo en header-afbeelding.">
              <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Logo</div>
                  <div className="flex items-center gap-3">
                    <ThumbLarge url={profile.business.logoUrl} rounded />
                    <button
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={() => document.getElementById('logo-input')?.click()}
                    >
                      {logoUploading ? 'Uploaden…' : 'Upload logo'}
                    </button>
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setLogoError(null);
                          setLogoUploading(true);
                          uploadTo('business-logos', f, (u) => setProfile(p => ({ ...p, business: { ...p.business, logoUrl: u || '' } })))
                            .catch((err: unknown) => {
                              let msg = 'Upload mislukt';
                              if (err instanceof Error) msg = err.message;
                              setLogoError(msg);
                            })
                            .finally(() => setLogoUploading(false));
                        }
                      }}
                    />
                    {profile.business.logoUrl ? (
                      <button
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => setProfile(p => ({ ...p, business: { ...p.business, logoUrl: '' } }))}
                      >
                        Verwijderen
                      </button>
                    ) : null}
                    {logoError && <span className="text-sm text-red-600">{logoError}</span>}
                  </div>
                  <p className="text-sm text-neutral-500">Aanbevolen: vierkant PNG/JPG, min. 256×256, max 2MB.</p>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Banner</div>
                  <div className="overflow-hidden rounded-2xl border bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.business.bannerUrl || '/placeholder.svg'}
                      alt="banner"
                      className="h-36 w-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={() => document.getElementById('banner-input')?.click()}
                    >
                      {bannerUploading ? 'Uploaden…' : 'Upload banner'}
                    </button>
                    <input
                      id="banner-input"
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setBannerError(null);
                          setBannerUploading(true);
                          uploadTo('business-covers', f, (u) => setProfile(p => ({ ...p, business: { ...p.business, bannerUrl: u || '' } })))
                            .catch((err: unknown) => {
                              let msg = 'Upload mislukt';
                              if (err instanceof Error) msg = err.message;
                              setBannerError(msg);
                            })
                            .finally(() => setBannerUploading(false));
                        }
                      }}
                    />
                    {profile.business.bannerUrl ? (
                      <button
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => setProfile(p => ({ ...p, business: { ...p.business, bannerUrl: '' } }))}
                      >
                        Verwijderen
                      </button>
                    ) : null}
                    {bannerError && <span className="text-sm text-red-600">{bannerError}</span>}
                  </div>
                  <p className="text-sm text-neutral-500">Aanbevolen: 1600×400 landscape JPG/PNG, max 2MB.</p>
                </div>
              </div>
            </Section>

            {/* Categories */}
            <Section overline="Categorieën" title="Kies categorieën" subtitle="Max 8 relevante categorieën voor vindbaarheid.">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setProfile(p => {
                        const existing = (p.business as unknown as { categories?: string[] }).categories || [];
                        if (existing.includes(val)) return p; // already selected
                        const next = Array.from(new Set([...existing, val])).slice(0, 8);
                        const biz = p.business as unknown as Profile['business'] & { categories?: string[] };
                        return { ...p, business: { ...biz, categories: next } };
                      });
                      e.target.value = ''; // reset select
                    }}
                    className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  >
                    <option value="">Kies een categorie...</option>
                    {CATEGORIES.flatMap(cat => [
                      { name: cat.name, value: cat.name },
                      ...cat.subs.map(sub => ({ name: `${cat.name} › ${sub.name}`, value: sub.name }))
                    ]).map((opt, i) => (
                      <option key={i} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray((profile.business as unknown as { categories?: string[] }).categories) && (profile.business as unknown as { categories?: string[] }).categories!.map((c: string) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-sm">
                      {c}
                      <button type="button" className="ms-1 text-emerald-700 hover:text-red-600" onClick={() => setProfile(p => {
                        const existing = (p.business as unknown as { categories?: string[] }).categories || [];
                        const next = existing.filter(x => x !== c);
                        const biz = p.business as unknown as Profile['business'] & { categories?: string[] };
                        return { ...p, business: { ...biz, categories: next } };
                      })}>×</button>
                    </span>
                  ))}
                </div>
                <p className="text-sm text-neutral-500">Selecteer categorieën uit de lijst voor betere vindbaarheid.</p>
              </div>
            </Section>

            {/* Winkelgegevens */}
            <Section overline="Winkel" title="Winkelgegevens" subtitle="Kies je publieksnaam en URL-slug (uniek).">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Shopnaam (publiek)">
                  <Input
                    value={profile.business.shopName}
                    onChange={(e) => onShopNameChange(e.target.value)}
                    placeholder="Bv. Retro Vinyl Store"
                  />
                </Field>
                <Field label="Slug (url)">
                  <div className="flex items-center gap-2">
                    <Input
                      value={profile.business.shopSlug}
                      onChange={(e) => onShopSlugChange(e.target.value)}
                      placeholder="bv. retro-vinyl-store"
                    />
                    <SlugStatus state={checkingSlug} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">Wordt zichtbaar als /shop/<strong>{profile.business.shopSlug || 'jouw-slug'}</strong></p>
                </Field>
                <Field label="Website">
                  <Input
                    value={profile.business.website}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, website: e.target.value } }))}
                    placeholder="https://"
                  />
                </Field>
                <Field label="Publieke beschrijving (over ons)">
                  <Textarea
                    rows={4}
                    value={profile.business.description || ''}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, description: e.target.value } }))}
                    placeholder="Beschrijf je winkel, specialisaties en service…"
                  />
                </Field>
              </div>
            </Section>

            {/* Eigen betaalterminal (Stripe onboarding) */}
            <Section
              id="betaalterminal"
              overline="Betalingen"
              title="Eigen betaalterminal"
              subtitle="Registreer je als verkoper om betalingen veilig via je eigen betaalterminal te ontvangen."
              defaultCollapsed={openSection !== 'betaalterminal'}
            >
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-neutral-700 mb-3">Wil je dat kopers via je eigen betaalterminal kunnen betalen? Registreer je verkopersaccount bij onze betalingsprovider.</p>
                <div className="flex items-center gap-3">
                                    <span className="text-sm text-neutral-600">Betalen via je eigen betaalterminal betekent veilig betalen voor je klant. Door je gegevens aan te leveren ontvang je de badge &apos;geverifieerde gebruiker&apos;. Betalingen lopen rechtstreeks via onze betaalprovider en klanten kunnen uit verschillende betaalwijzen kiezen. Dit verhoogt het vertrouwen van kopers aanzienlijk.</span>
                </div>
                {stripeStatus && (
                  <div className="mt-4">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                      stripeStatus.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      stripeStatus.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                      stripeStatus.status === 'rejected' ? 'bg-red-50 text-red-800 border border-red-200' :
                      'bg-gray-50 text-gray-800 border border-gray-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        stripeStatus.status === 'approved' ? 'bg-emerald-500' :
                        stripeStatus.status === 'pending' ? 'bg-yellow-500' :
                        stripeStatus.status === 'rejected' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                      {stripeStatus.message}
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Registratie</h4>
                  <p className="text-sm text-neutral-700 mb-3">Vul hieronder je gegevens en upload identiteitsdocumenten. Ocaso verwerkt dit namens jou en stuurt de gegevens naar onze betalingsprovider.</p>
                  <KycForm onSuccess={refreshStripeStatus} />
                </div>
              </div>
            </Section>

            {/* Zichtbaarheid & contact */}

            {/* Zichtbaarheid & contact */}
            <Section overline="Zichtbaarheid" title="Contact & zichtbaarheid" subtitle="Kies wat kopers mogen zien op je winkelpagina.">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Publiek e-mailadres">
                  <Input
                    value={profile.business.invoiceEmail}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceEmail: e.target.value } }))}
                    placeholder="contact@bedrijf.be"
                  />
                </Field>
                <Field label="Publiek telefoonnummer">
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+32 4xx xx xx xx"
                  />
                </Field>

                <div className="col-span-full grid gap-3 sm:grid-cols-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={!!profile.business.public.showEmail}
                      onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, public: { ...p.business.public, showEmail: e.target.checked } } }))}
                    />
                    <span className="text-sm">Toon e-mailadres aan kopers</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={!!profile.business.public.showPhone}
                      onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, public: { ...p.business.public, showPhone: e.target.checked } } }))}
                    />
                    <span className="text-sm">Toon telefoonnummer aan kopers</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Socials */}
            <Section overline="Socials" title="Social media" subtitle="Voeg links toe zodat kopers je kunnen volgen.">
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Instagram">
                  <Input
                    placeholder="@jouwaccount of volledige URL"
                    value={profile.business.socials.instagram}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, socials: { ...p.business.socials, instagram: e.target.value } } }))}
                  />
                </Field>
                <Field label="Facebook">
                  <Input
                    placeholder="paginanaam of URL"
                    value={profile.business.socials.facebook}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, socials: { ...p.business.socials, facebook: e.target.value } } }))}
                  />
                </Field>
                <Field label="TikTok">
                  <Input
                    placeholder="@jouwaccount of URL"
                    value={profile.business.socials.tiktok}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, socials: { ...p.business.socials, tiktok: e.target.value } } }))}
                  />
                </Field>
              </div>
            </Section>

            {/* Wettelijke info */}
            <Section overline="Wettelijk" title="Bedrijfsgegevens" subtitle="Helpt bij vertrouwen & verificatie van je winkel.">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Bedrijfsnaam">
                  <Input
                    value={profile.business.companyName}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, companyName: e.target.value } }))}
                    placeholder="BV Voorbeeld"
                  />
                </Field>
                <Field label="BTW-nummer (VAT)">
                  <Input
                    value={profile.business.vatNumber}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, vatNumber: e.target.value } }))}
                    placeholder="BE0123.456.789"
                  />
                  {vatVerificationMessage && (
                    <p className={`text-sm mt-1 ${vatVerificationStatus === 'valid' ? 'text-green-600' : vatVerificationStatus === 'invalid' ? 'text-red-600' : 'text-neutral-500'}`}>
                      {vatVerificationMessage}
                    </p>
                  )}
                </Field>
                <Field label="Ondernemingsnr. (KBO)">
                  <Input
                    value={profile.business.registrationNr}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, registrationNr: e.target.value } }))}
                    placeholder="xxxx.xxx.xxx"
                  />
                </Field>
                {/* removed inline bulk card; rendered below as dedicated Section */}
                <div className="rounded-xl border p-3">
                  <div className="text-sm">
                    Verificatie-status:{' '}
                    <span className={verified ? 'text-emerald-700' : 'text-amber-700'}>
                      {verified ? 'Geverifieerd (basis)' : vatVerificationStatus === 'valid' ? 'BTW geverifieerd - vul KBO in' : 'Niet geverifieerd'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    Vul bedrijfsnaam, BTW (moet geldig zijn) en KBO in voor een basis-verificatiebadge.
                  </p>
                </div>
              </div>
            </Section>

            {/* Facturatie */}
            <Section overline="Facturatie" title="Facturatiegegevens" subtitle="Deze informatie wordt gebruikt voor facturen en automatische invulling bij checkout.">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Factuur e-mail">
                  <Input
                    type="email"
                    value={profile.business.invoiceEmail}
                    onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceEmail: e.target.value } }))}
                    placeholder="facturatie@bedrijf.be"
                  />
                </Field>
                <div className="md:col-span-2">
                  <div className="text-sm font-medium mb-3">Factuuradres</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Voornaam">
                      <Input
                        value={profile.business.invoiceAddress.firstName}
                        onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceAddress: { ...p.business.invoiceAddress, firstName: e.target.value } } }))}
                        placeholder="Jan"
                      />
                    </Field>
                    <Field label="Achternaam">
                      <Input
                        value={profile.business.invoiceAddress.lastName}
                        onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceAddress: { ...p.business.invoiceAddress, lastName: e.target.value } } }))}
                        placeholder="Janssens"
                      />
                    </Field>
                    <Field label="Straat + nummer">
                      <Input
                        value={profile.business.invoiceAddress.street}
                        onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceAddress: { ...p.business.invoiceAddress, street: e.target.value } } }))}
                        placeholder="Hoofdstraat 123"
                      />
                    </Field>
                    <Field label="Postcode">
                      <Input
                        value={profile.business.invoiceAddress.zip}
                        onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceAddress: { ...p.business.invoiceAddress, zip: e.target.value } } }))}
                        placeholder="9000"
                      />
                    </Field>
                    <Field label="Gemeente">
                      <Input
                        value={profile.business.invoiceAddress.city}
                        onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceAddress: { ...p.business.invoiceAddress, city: e.target.value } } }))}
                        placeholder="Gent"
                      />
                    </Field>
                    <Field label="Land">
                      <Input
                        value={profile.business.invoiceAddress.country}
                        onChange={(e) => setProfile(p => ({ ...p, business: { ...p.business, invoiceAddress: { ...p.business.invoiceAddress, country: e.target.value } } }))}
                        placeholder="België"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            {/* Dedicated Bulk upload section */}
            <Section overline="Bulk upload" title="Bulk upload zoekertjes" subtitle="Upload meerdere zoekertjes via Excel (XLSX) of CSV. Gebruik het template om kolommen te volgen.">
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">Download het template en vul per rij een zoekertje in. Ondersteunde kolommen: title, price, description, location, category, images (komma-gescheiden URLs).</p>
                <div className="flex items-center gap-3">
                  <a href="/templates/bulk-listings-template.xlsx" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50">Template downloaden</a>
                  <input
                    id="bulk-file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setFormError(null);
                      setFormOk(null);
                      try {
                        const form = new FormData();
                        form.append('file', f);
                        const res = await fetch('/api/profile/listings/bulk-upload', { method: 'POST', body: form });
                        const j = await res.json();
                        if (!res.ok) throw new Error(j.error || 'Upload fout');
                        // Show summary
                        type UploadResult = { row: number; ok: boolean; error?: string; listingId?: string };
                        const results: UploadResult[] = (j.results || []) as UploadResult[];
                        const ok = results.filter((r) => r.ok).length;
                        const failed = results.filter((r) => !r.ok);
                        setFormOk(`Verwerkt: ${j.processed}. Succes: ${ok}. Fouten: ${failed.length}`);
                        if (failed.length) setFormError(failed.slice(0,5).map((f) => `Rij ${f.row}: ${f.error}`).join(' | '));
                        // Trigger listing refresh elsewhere
                        try { window.dispatchEvent(new Event('ocaso:listings-changed')); } catch (e) { /* ignore dispatch errors */ }
                      } catch (err: unknown) {
                        setFormError(err instanceof Error ? err.message : 'Upload mislukt');
                      }
                    }}
                  />
                  <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white" onClick={() => document.getElementById('bulk-file')?.click()}>Kies bestand</button>
                  <div className="text-sm text-neutral-500">Max 500 rijen per upload</div>
                </div>
                {formError && <div className="text-sm text-red-600">{formError}</div>}
                {formOk && <div className="text-sm text-emerald-700">{formOk}</div>}
              </div>
            </Section>

            {/* Opslaan + Preview button onderaan */}
            <div className="flex items-center justify-end gap-2">
              {formError && <div className="text-sm text-red-600 me-auto">{formError}</div>}
              {formOk && <div className="text-sm text-emerald-600 me-auto">{formOk}</div>}
              <button
                onClick={() => setShowPreview(true)}
                className="rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              >
                Preview zakelijk profiel
              </button>
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

      {/* MODAL: Preview zakelijk profiel */}
      <PreviewModal open={showPreview} onClose={() => setShowPreview(false)} title="Voorbeeld — Zakelijk profiel">
        <ShopPreview
          name={profile.business.shopName || 'Jouw winkel'}
          slug={profile.business.shopSlug || 'jouw-slug'}
          logo={profile.business.logoUrl}
          banner={profile.business.bannerUrl}
          website={profile.business.website}
          description={profile.business.description}
          showEmail={!!profile.business.public.showEmail}
          showPhone={!!profile.business.public.showPhone}
          email={profile.business.invoiceEmail}
          phone={profile.phone}
          socials={profile.business.socials}
          verified={verified}
        />
      </PreviewModal>
    </div>
  );
}

/* --------------------------------- atoms --------------------------------- */
function Section({
  overline, title, subtitle, children, collapsible = true, defaultCollapsed = true, id,
}: { overline?: string; title: string; subtitle?: string; children: React.ReactNode; collapsible?: boolean; defaultCollapsed?: boolean; id?: string }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  function toggle() { if (!collapsible) return; setCollapsed(c => !c); }
  return (
    <section id={id} className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6 pb-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className={`group flex w-full items-start gap-4 text-left ${collapsible ? 'cursor-pointer' : ''}`}
        >
          <div className="flex-1">
            {overline ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{overline}</div>
            ) : null}
            <h2 className="mt-1 text-xl font-semibold tracking-tight flex items-center gap-2">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-neutral-600">{subtitle}</p> : null}
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
      <div className={`grid gap-4 px-6 pb-6 ${collapsed ? 'hidden' : ''}`}>{children}</div>
    </section>
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
      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200"
    />
  );
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200"
    />
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
function ThumbLarge({ url, rounded = false }: { url?: string | null; rounded?: boolean }) {
  return (
    <div className={`h-20 w-20 overflow-hidden ${rounded ? 'rounded-2xl' : 'rounded-md'} border bg-neutral-100`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
function SlugStatus({ state }: { state: null | 'ok' | 'taken' | 'err' }) {
  if (!state) return null;
  const map = {
    ok: 'Beschikbaar',
    taken: 'Niet beschikbaar',
    err: 'Onbekend',
  } as const;
  const cls = state === 'ok' ? 'text-emerald-700' : state === 'taken' ? 'text-amber-700' : 'text-neutral-500';
  return <span className={`text-sm ${cls}`}>{map[state]}</span>;
}

/* ------------------------------ modal + preview --------------------------- */
function PreviewModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  // ESC support
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-base font-semibold">{title || 'Preview'}</h3>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm hover:bg-neutral-50"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function ShopPreview({
  name, slug, logo, banner, website, description,
  showEmail, showPhone, email, phone, socials, verified,
}: {
  name: string; slug: string;
  logo?: string | null; banner?: string | null; website?: string | null;
  description?: string | null;
  showEmail: boolean; showPhone: boolean; email?: string | null; phone?: string | null;
  socials: { instagram?: string; facebook?: string; tiktok?: string };
  verified: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative">
        {/* Banner */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner || '/placeholder.svg'} alt="" className="h-36 w-full object-cover" />
        {/* Logo */}
        <div className="absolute -bottom-8 left-6 h-16 w-16 overflow-hidden rounded-2xl border-4 border-white shadow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="px-6 pb-6 pt-10">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
          {verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-sm text-emerald-700">
              ✓ Geverifieerd
            </span>
          )}
          <span className="ms-auto text-sm text-neutral-500">/shop/{slug}</span>
        </div>

        {description ? <p className="mt-2 text-sm text-neutral-700">{description}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {website ? (
            <span className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1">🌐 <span className="truncate max-w-[200px]">{website}</span></span>
          ) : null}
          {showEmail && email ? <span className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1">✉️ {email}</span> : null}
          {showPhone && phone ? <span className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1">📞 {phone}</span> : null}
          {socials?.instagram ? <span className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1">📸 {socials.instagram}</span> : null}
          {socials?.facebook ? <span className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1">📘 {socials.facebook}</span> : null}
          {socials?.tiktok ? <span className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1">🎵 {socials.tiktok}</span> : null}
        </div>
      </div>
    </div>
  );
}
