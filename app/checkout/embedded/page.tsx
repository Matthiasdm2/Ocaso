'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { createClient } from '@/lib/supabaseClient';

type ProfileBilling = {
  full_name?: string | null;
  company_name?: string | null;
  vat?: string | null;
  registration_nr?: string | null;
  invoice_email?: string | null;
  invoice_address?: { name?: string; firstName?: string; lastName?: string; street?: string; zip?: string; city?: string; country?: string } | null;
};

export default function EmbeddedCheckoutPage() {
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const plan = sp?.get('plan');
  const billing = sp?.get('billing');
  const mode = sp?.get('mode') || 'subscription';
  const credits = sp?.get('credits');

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileBilling, setProfileBilling] = useState<ProfileBilling | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [buyerType, setBuyerType] = useState<'consumer' | 'business'>('consumer');
  const [buyerTypeTouched, setBuyerTypeTouched] = useState(false);
  const buyerTypeInitialized = useRef(false);

  const label = useMemo(() => {
    if (mode === 'credits') {
      return `Credits — ${credits || ''}`.trim();
    }
    const p = plan === 'pro' ? 'Pro' : 'Basic';
    const b = billing === 'yearly' ? 'Jaarlijks' : 'Maandelijks';
    return `${p} — ${b}`;
  }, [mode, plan, billing, credits]);

  const priceText = useMemo(() => {
    if (mode === 'credits') {
      const qty = Number(credits || 0);
      const pricing: Record<number, number> = { 4: 1, 25: 5 };
      const amount = pricing[qty] ?? 0;
      try {
        return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
      } catch {
        return `€${amount.toFixed(2)}`;
      }
    }
    const prices = {
      basic: { monthly: 15, yearly: 150 },
      pro: { monthly: 25, yearly: 240 },
    } as const;
    const p = (plan === 'pro' ? 'pro' : 'basic') as keyof typeof prices;
    const c = (billing === 'yearly' ? 'yearly' : 'monthly') as keyof (typeof prices)['basic'];
    const amount = prices[p][c];
    const unit = c === 'yearly' ? '/jaar' : '/maand';
    try {
      return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount) + unit;
    } catch {
      return `€${amount}${unit}`;
    }
  }, [mode, plan, billing, credits]);

  // One-time profile load and initial buyer type suggestion
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        setProfileLoading(true);
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, company_name, vat, registration_nr, invoice_email, invoice_address')
            .eq('id', user.user.id)
            .single();
          console.log('Loaded profile data:', data);
          if (data) setProfileBilling(data as ProfileBilling);
          if (!buyerTypeTouched && !buyerTypeInitialized.current) {
            const hasBiz = !!(data?.company_name || data?.vat || data?.invoice_address?.street || data?.invoice_email);
            console.log('Auto-detecting buyer type:', hasBiz ? 'business' : 'consumer', 'based on company_name:', data?.company_name, 'vat:', data?.vat, 'invoice_address:', data?.invoice_address, 'invoice_email:', data?.invoice_email);
            setBuyerType(hasBiz ? 'business' : 'consumer');
            buyerTypeInitialized.current = true;
          }
        }
      } catch {
        // ignore
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [buyerTypeTouched]);

  // Create or refresh embedded checkout session when plan/billing/buyerType changes (or credits mode)
  useEffect(() => {
    (async () => {
      if (mode !== 'credits' && (!plan || !billing)) {
        setError('Ontbrekende plan of billing');
        setLoading(false);
        return;
      }
      if (mode === 'credits' && !credits) {
        setError('Aantal credits ontbreekt');
        setLoading(false);
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Niet ingelogd');
        setLoading(false);
        return;
      }
      try {
        const endpoint = mode === 'credits' ? '/api/stripe/create-credits-session' : '/api/stripe/create-checkout-session';
        const payload = mode === 'credits' ? { credits, buyerType } : { plan, billing, buyerType };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Kon checkout niet starten');
        
        // Check if we have billing info that should trigger hosted checkout for better prefill
        const hasBillingInfo = profileBilling?.invoice_email || 
                              profileBilling?.invoice_address?.street || 
                              profileBilling?.company_name;
        
        // Prefer hosted checkout when billing info is available for better prefill support
        if (data.url && hasBillingInfo) {
          // Use hosted checkout for better prefill when billing info exists
          window.location.href = data.url;
          return;
        } else if (data.clientSecret) {
          // Use embedded checkout as fallback
          setClientSecret(data.clientSecret);
        } else if (data.url) {
          // Fallback to hosted checkout
          window.location.href = data.url;
          return;
        } else {
          throw new Error('No checkout method available');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Onbekende fout');
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, credits, plan, billing, buyerType, profileBilling?.invoice_email, profileBilling?.invoice_address?.street, profileBilling?.company_name]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      if (!clientSecret) return;
      const { loadStripe } = await import('@stripe/stripe-js');
  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
      if (!stripe) {
        setError('Stripe configuratie ontbreekt');
        return;
      }
      // Create embedded checkout (fallback if hosted checkout fails)
  // Types for initEmbeddedCheckout may lag; access via index to avoid type errors
      interface EmbeddedCheckout {
        mount: (selector: string) => void;
        destroy?: () => void;
      }
      interface StripeExtended {
        initEmbeddedCheckout: (opts: { clientSecret: string }) => Promise<EmbeddedCheckout>;
      }
      const checkout = await (stripe as unknown as StripeExtended).initEmbeddedCheckout({ clientSecret });
      checkout.mount('#embedded-checkout');
      cleanup = () => checkout.destroy?.();
    })();
    return () => { if (cleanup) cleanup(); };
  }, [clientSecret]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-40 bg-neutral-200 rounded" />
            <div className="h-8 w-64 bg-neutral-200 rounded" />
            <div className="h-72 w-full bg-neutral-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <div className="font-semibold mb-1">Er ging iets mis</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-1.657 1.343-3 3-3V6a3 3 0 10-6 0v2a3 3 0 013 3z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{mode === 'credits' ? 'Credits kopen' : 'Abonnement activeren'}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  {label}
                </span>
                <span className="text-xs text-neutral-500">Beveiligde betaling via Stripe</span>
              </div>
            </div>
          </div>
          <button onClick={() => window.history.back()} className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm">Terug</button>
        </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Info/Facturatie links (sticky on desktop) */}
          <aside className="order-1 lg:order-none lg:sticky lg:top-6 h-max rounded-2xl border border-neutral-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                {label}
              </div>
              <div className="mt-1 text-sm text-neutral-600">{priceText}</div>
            </div>
            {/* Buyer type toggle */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-neutral-600">Kopen als:</span>
        <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
                <button
                  type="button"
          onClick={() => { setBuyerType('consumer'); setBuyerTypeTouched(true); }}
                  className={`px-3 py-1.5 text-sm rounded-md ${buyerType === 'consumer' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                >Particulier</button>
                <button
                  type="button"
          onClick={() => { setBuyerType('business'); setBuyerTypeTouched(true); }}
                  className={`px-3 py-1.5 text-sm rounded-md ${buyerType === 'business' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                >Zakelijk</button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-neutral-900">Facturatiegegevens</h2>
              <a href="/profile/business" className="text-sm text-emerald-700 hover:underline">Bewerken</a>
            </div>

            {profileLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-1/2 bg-neutral-200 rounded" />
                <div className="h-4 w-2/3 bg-neutral-200 rounded" />
                <div className="h-4 w-1/3 bg-neutral-200 rounded" />
                <div className="h-20 w-full bg-neutral-200 rounded" />
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* Naam bij particulier, Bedrijf bij zakelijk */}
                {buyerType === 'business' ? (
                  <div>
                    <label className="text-neutral-500 block mb-1">Bedrijfsnaam</label>
                    <input
                      value={profileBilling?.company_name || ''}
                      onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), company_name: e.target.value }))}
                      onBlur={async (e) => {
                        const v = e.target.value;
                        setSavingField('company_name'); setSaveMsg(null);
                        try {
                          const res = await fetch('/api/profile/business', {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ companyName: v }),
                          });
                          if (!res.ok) throw new Error('Opslaan mislukt');
                          setSaveMsg('Opgeslagen');
                          setTimeout(() => setSaveMsg(null), 1500);
                        } finally { setSavingField(null); }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                      placeholder="Bedrijfsnaam"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-neutral-500 block mb-1">Voornaam</label>
                      <input
                        value={profileBilling?.invoice_address?.firstName || ''}
                        onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_address: { ...(p?.invoice_address || {}), firstName: e.target.value } }))}
                        onBlur={async (e) => {
                          const v = e.target.value; setSavingField('invoice_address.firstName'); setSaveMsg(null);
                          try {
                            const addr = { ...(profileBilling?.invoice_address || {}), firstName: v };
                            const res = await fetch('/api/profile/business', {
                              method: 'PUT', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ invoiceAddress: addr }),
                            }); if (!res.ok) throw new Error('Opslaan mislukt');
                            setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                          } finally { setSavingField(null); }
                        }}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                        placeholder="Voornaam"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-500 block mb-1">Achternaam</label>
                      <input
                        value={profileBilling?.invoice_address?.lastName || ''}
                        onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_address: { ...(p?.invoice_address || {}), lastName: e.target.value } }))}
                        onBlur={async (e) => {
                          const v = e.target.value; setSavingField('invoice_address.lastName'); setSaveMsg(null);
                          try {
                            const addr = { ...(profileBilling?.invoice_address || {}), lastName: v };
                            const res = await fetch('/api/profile/business', {
                              method: 'PUT', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ invoiceAddress: addr }),
                            }); if (!res.ok) throw new Error('Opslaan mislukt');
                            setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                          } finally { setSavingField(null); }
                        }}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                        placeholder="Achternaam"
                      />
                    </div>
                  </div>
                )}
                {/* BTW & ondernemingsnummer */}
                {buyerType === 'business' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-500 block mb-1">BTW-nummer</label>
                    <input
                      value={profileBilling?.vat || ''}
                      onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), vat: e.target.value }))}
                      onBlur={async (e) => {
                        const v = e.target.value; setSavingField('vat'); setSaveMsg(null);
                        try {
                          const res = await fetch('/api/profile/business', {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ vatNumber: v }),
                          }); if (!res.ok) throw new Error('Opslaan mislukt');
                          setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                        } finally { setSavingField(null); }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                      placeholder="BE0123.456.789"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Ondernemingsnummer</label>
                    <input
                      value={profileBilling?.registration_nr || ''}
                      onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), registration_nr: e.target.value }))}
                      onBlur={async (e) => {
                        const v = e.target.value; setSavingField('registration_nr'); setSaveMsg(null);
                        try {
                          const res = await fetch('/api/profile/business', {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ registrationNr: v }),
                          }); if (!res.ok) throw new Error('Opslaan mislukt');
                          setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                        } finally { setSavingField(null); }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                      placeholder="KBO nr."
                    />
                  </div>
                </div>
                )}
                {/* Facturatie e-mail */}
                <div>
                  <label className="text-neutral-500 block mb-1">Facturatie e-mail</label>
                  <input
                    type="email"
                    value={profileBilling?.invoice_email || ''}
                    onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_email: e.target.value }))}
                    onBlur={async (e) => {
                      const v = e.target.value; setSavingField('invoice_email'); setSaveMsg(null);
                      try {
                        const res = await fetch('/api/profile/business', {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ invoiceEmail: v }),
                        }); if (!res.ok) throw new Error('Opslaan mislukt');
                        setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                      } finally { setSavingField(null); }
                    }}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                    placeholder="facturatie@bedrijf.be"
                  />
                </div>
                {/* Adres velden */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-neutral-500 block mb-1">Straat</label>
                    <input
                      value={profileBilling?.invoice_address?.street || ''}
                      onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_address: { ...(p?.invoice_address || {}), street: e.target.value } }))}
                      onBlur={async (e) => {
                        const v = e.target.value; setSavingField('invoice_address.street'); setSaveMsg(null);
                        try {
                          const addr = { ...(profileBilling?.invoice_address || {}), street: v };
                          const res = await fetch('/api/profile/business', {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invoiceAddress: addr }),
                          }); if (!res.ok) throw new Error('Opslaan mislukt');
                          setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                        } finally { setSavingField(null); }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                      placeholder="Straat en nr."
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-neutral-500 block mb-1">Postcode</label>
                      <input
                        value={profileBilling?.invoice_address?.zip || ''}
                        onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_address: { ...(p?.invoice_address || {}), zip: e.target.value } }))}
                        onBlur={async (e) => {
                          const v = e.target.value; setSavingField('invoice_address.zip'); setSaveMsg(null);
                          try {
                            const addr = { ...(profileBilling?.invoice_address || {}), zip: v };
                            const res = await fetch('/api/profile/business', {
                              method: 'PUT', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ invoiceAddress: addr }),
                            }); if (!res.ok) throw new Error('Opslaan mislukt');
                            setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                          } finally { setSavingField(null); }
                        }}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                        placeholder="9000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-neutral-500 block mb-1">Gemeente</label>
                      <input
                        value={profileBilling?.invoice_address?.city || ''}
                        onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_address: { ...(p?.invoice_address || {}), city: e.target.value } }))}
                        onBlur={async (e) => {
                          const v = e.target.value; setSavingField('invoice_address.city'); setSaveMsg(null);
                          try {
                            const addr = { ...(profileBilling?.invoice_address || {}), city: v };
                            const res = await fetch('/api/profile/business', {
                              method: 'PUT', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ invoiceAddress: addr }),
                            }); if (!res.ok) throw new Error('Opslaan mislukt');
                            setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                          } finally { setSavingField(null); }
                        }}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                        placeholder="Gent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-neutral-500 block mb-1">Land</label>
                    <input
                      value={profileBilling?.invoice_address?.country || 'België'}
                      onChange={(e) => setProfileBilling((p) => ({ ...(p || {}), invoice_address: { ...(p?.invoice_address || {}), country: e.target.value } }))}
                      onBlur={async (e) => {
                        const v = e.target.value; setSavingField('invoice_address.country'); setSaveMsg(null);
                        try {
                          const addr = { ...(profileBilling?.invoice_address || {}), country: v };
                          const res = await fetch('/api/profile/business', {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invoiceAddress: addr }),
                          }); if (!res.ok) throw new Error('Opslaan mislukt');
                          setSaveMsg('Opgeslagen'); setTimeout(() => setSaveMsg(null), 1500);
                        } finally { setSavingField(null); }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-neutral-300"
                      placeholder="België"
                    />
                  </div>
                </div>
                {saveMsg && (
                  <div className="text-xs text-emerald-700">{saveMsg}</div>
                )}
                {savingField && (
                  <div className="text-xs text-neutral-500">Opslaan…</div>
                )}
                <div className="pt-2 text-xs text-neutral-500">Deze gegevens worden gebruikt voor de factuur gekoppeld aan je betaling.</div>
              </div>
            )}
          </aside>

          {/* Checkout rechts */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-600 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-1.657 1.343-3 3-3V6a3 3 0 10-6 0v2a3 3 0 013 3z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z"/></svg>
                Veilig betalen via Stripe
              </div>
              <span className="text-xs text-neutral-500">{label}</span>
            </div>
            <div id="embedded-checkout" className="min-h-[560px] rounded-lg" />
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-500">Door te betalen ga je akkoord met onze algemene voorwaarden en privacyverklaring.</p>
      </div>
    </div>
  );
}
