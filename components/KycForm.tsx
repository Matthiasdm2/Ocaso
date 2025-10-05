/* eslint-disable simple-import-sort/imports */
"use client";
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Elements, IbanElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeIbanElement } from '@stripe/stripe-js';

import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabaseClient';

const AddPayoutIban = dynamic(() => import('@/components/AddPayoutIban'), { ssr: false });
// Don't call loadStripe at module-eval time (prevents SSR errors when env var missing)
// stripePromise will be initialized client-side to avoid SSR issues
// and undefined env var errors in older stripe-js versions.

interface KycFormProps {
  onSuccess?: () => void;
}

export default function KycForm({ onSuccess }: KycFormProps) {
  // Initialize Stripe client only on the browser to avoid SSR issues
  const [stripePromiseState, setStripePromiseState] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    // Only run on client and if not initialized yet
    if (typeof window === 'undefined' || stripePromiseState) return;
    (async () => {
      try {
        const mod = await import('@stripe/stripe-js');
        const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!key) {
          console.warn('Stripe publishable key not set; IBAN fields will be disabled');
          setStripePromiseState(null);
          return;
        }
        setStripePromiseState(mod.loadStripe(key));
      } catch (e) {
        console.warn('Stripe could not be initialized', e);
        setStripePromiseState(null);
      }
    })();
  }, [stripePromiseState]);

  // Always render an Elements provider (stripe may be null while initializing).
  // This ensures useStripe/useElements can be called inside `KycFormInner` safely;
  // when stripe isn't ready the hooks will simply return null until initialization completes.
  return (
    <Elements stripe={stripePromiseState} options={{ appearance: { theme: 'stripe' } }}>
      <KycFormInner onSuccess={onSuccess} stripePromiseState={stripePromiseState} />
    </Elements>
  );
}

interface KycFormInnerProps extends KycFormProps {
  stripePromiseState: Promise<Stripe | null> | null;
}

function KycFormInner({ onSuccess, stripePromiseState }: KycFormInnerProps) {
  const supabase = createClient();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('');
  const [businessType, setBusinessType] = useState<'individual' | 'company'>('individual');
  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [companyVat, setCompanyVat] = useState('');
  const [vatVerificationStatus, setVatVerificationStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [vatVerificationMessage, setVatVerificationMessage] = useState<string>('');
  const [owners, setOwners] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    dob: { day: string; month: string; year: string };
    nationality: string;
    ownership_percentage?: string;
    idFront?: File | null;
    idBack?: File | null;
  }>>([]);
  const [bankAccount, setBankAccount] = useState({ iban: '', bic: '' });
  const stripe = useStripe();
  const elements = useElements();
  // refs for owner file inputs will be stored in-state as map of refs if needed for future fine-grained clicks
  const [address, setAddress] = useState({ line1: '', city: '', postal_code: '', country: 'BE' });
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const idFrontRef = useRef<HTMLInputElement | null>(null);
  const idBackRef = useRef<HTMLInputElement | null>(null);

  // Load existing bank details from profile
  useEffect(() => {
    async function loadProfileData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
  // Prefill known email
  if (session.user.email) setEmail(session.user.email);

        const { data: profile } = await supabase
          .from('profiles')
          .select('bank')
          .eq('id', session.user.id)
          .single();

        if (profile?.bank) {
          setBankAccount({
            iban: profile.bank.iban || '',
            bic: profile.bank.bic || ''
          });
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    }

    loadProfileData();
  }, [supabase]);

  // set default branch when business type changes to individual
  useEffect(() => {
    if (businessType === 'individual') setBranch('Particuliere verkoop');
  }, [businessType]);

  async function uploadFile(file: File | null) {
    if (!file) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Niet ingelogd');

    const formData = new FormData();
    formData.append('file', file);
  const res = await fetch(`/api/stripe/custom/file?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(`File upload failed: ${errorData.error || res.status}`);
    }
    const d = await res.json().catch(() => null);
    if (!d?.file?.id) {
      throw new Error('File upload succeeded but no file ID returned');
    }
    return d.file.id;

  }

  // Auto-clear top-level inline error after 5s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Helper: normalize IBAN (remove spaces, uppercase)
  function normalizeIban(input: string) {
    return input.replace(/\s+/g, '').toUpperCase();
  }

  // Helper: format IBAN for display (group by 4 chars)
  function formatIban(input: string) {
    const s = normalizeIban(input);
    return s.replace(/(.{4})/g, '$1 ').trim();
  }

  // Basic IBAN validation (structure check)
  function isValidIban(input: string) {
    const s = normalizeIban(input);
    // Basic check: starts with two letters followed by alphanumerics, length between 15 and 34
    return /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(s);
  }

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

  // Onmiddellijke BTW verificatie
  useEffect(() => {
    if (companyVat.trim()) {
      verifyVatNumber(companyVat);
    } else {
      setVatVerificationStatus('idle');
      setVatVerificationMessage('');
    }
  }, [companyVat, verifyVatNumber]);

  async function ensureAccount(kycPayload: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Niet ingelogd');

    const res = await fetch('/api/stripe/custom/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(kycPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'onboard failed' }));
      throw new Error(err.error || `Onboard failed: ${res.status}`);
    }
    return res.json();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Niet ingelogd');

      if (businessType === 'individual' && (!firstName.trim() || !lastName.trim())) throw new Error('Vul voor- en achternaam in');
      if (businessType === 'company' && !companyName.trim()) throw new Error('Vul bedrijfsnaam in');
      if (!bankAccount.iban.trim()) throw new Error('IBAN is verplicht voor uitbetalingen');
      if (!bankAccount.bic.trim() && !bankAccount.iban.toUpperCase().startsWith('BE')) throw new Error('BIC is verplicht voor niet-Belgische rekeningen');

  const frontId = await uploadFile(idFront);
  const backId = await uploadFile(idBack);

      // Validate required files for individual
      if (businessType === 'individual' && !frontId) {
        throw new Error('ID voorkant uploaden is verplicht');
      }

      // Upload owner files and build owners payload
      const ownersPayload: Array<Record<string, unknown>> = [];
      for (const owner of owners) {
  const ownerFront = await uploadFile(owner.idFront ?? null);
  const ownerBack = await uploadFile(owner.idBack ?? null);
        const ownerDob = owner.dob.day && owner.dob.month && owner.dob.year ? { 
          day: Number(owner.dob.day), 
          month: Number(owner.dob.month), 
          year: Number(owner.dob.year) 
        } : undefined;
        
        // Validate owner data
        if (!owner.first_name || !owner.last_name) {
          throw new Error('Voor- en achternaam eigenaar zijn verplicht');
        }
        if (!ownerDob) {
          throw new Error('Geboortedatum eigenaar is verplicht');
        }
        
        const ownerObj: Record<string, unknown> = {
          first_name: owner.first_name,
          last_name: owner.last_name,
          dob: ownerDob,
        };
        
        if (owner.nationality) ownerObj.nationality = owner.nationality;
        if (owner.ownership_percentage) ownerObj.percent_ownership = Number(owner.ownership_percentage);
        
  // Verification object for owner (platform expects a document object with front/back)
        if (ownerFront || ownerBack) {
          const doc: Record<string, unknown> = {};
          if (ownerFront) doc.front = ownerFront;
          if (ownerBack) doc.back = ownerBack;
          ownerObj.verification = { document: doc };
        }
        
        ownersPayload.push(ownerObj);
      }

      const payload: Record<string, unknown> = { business_type: businessType === 'company' ? 'company' : 'individual' };
  // Include known email at account level so the platform has a contact email
  if (email) payload.email = email;

  // Include business profile / branch info
  if (branch) payload.business_profile = { product_description: branch };
      if (businessType === 'individual') {
        // Validate individual data
        const individualDob = dob.day && dob.month && dob.year ? { 
          day: Number(dob.day), 
          month: Number(dob.month), 
          year: Number(dob.year) 
        } : undefined;
        
        if (!individualDob) {
          throw new Error('Geboortedatum is verplicht');
        }
        
        // Build individual object with only defined values
        const individual: Record<string, unknown> = {
          first_name: firstName,
          last_name: lastName,
          dob: individualDob,
        };
        
        if (phone) individual.phone = phone;
        if (nationality) individual.nationality = nationality;
        
        // Address object
        const addressObj: Record<string, unknown> = {};
        if (address.line1) addressObj.line1 = address.line1;
        if (address.city) addressObj.city = address.city;
        if (address.postal_code) addressObj.postal_code = address.postal_code;
        if (address.country) addressObj.country = address.country;
        if (Object.keys(addressObj).length > 0) individual.address = addressObj;
        
  // Verification object (platform expects a document object with front/back)
        if (frontId || backId) {
          const doc: Record<string, unknown> = {};
          if (frontId) doc.front = frontId;
          if (backId) doc.back = backId;
          individual.verification = { document: doc };
        }
        
        if (Object.keys(individual).length > 0) payload.individual = individual;
      } else {
        // Build company object with only defined values
        const companyObj: Record<string, unknown> = {};
        if (companyName) companyObj.name = companyName;
        if (companyNumber) companyObj.registration_number = companyNumber;
        if (companyVat) companyObj.tax_id = companyVat;
        if (ownersPayload.length) companyObj.owners = ownersPayload;
        
        if (Object.keys(companyObj).length > 0) payload.company = companyObj;
      }

      // Add Terms of Service acceptance
      payload.tos_acceptance = {
        date: Math.floor(Date.now() / 1000),
  ip: '127.0.0.1', // Will be overridden by the platform with actual IP
        user_agent: navigator.userAgent,
      };

      // Add bank account: always tokenize IBAN client-side and include token in payload
      if (bankAccount.iban) {
        const accountHolderName = businessType === 'company'
          ? (companyName.trim() || `${firstName} ${lastName}`.trim())
          : `${firstName} ${lastName}`.trim();

        if (!accountHolderName) {
          throw new Error('Account houder naam is verplicht voor bankrekening');
        }

        let tokenId: string | null = null;

        // Try Elements tokenization first (if available)
        if (stripe && elements) {
          try {
            const ibanEl = elements.getElement(IbanElement);
            if (ibanEl) {
              const stripeClient = stripe as Stripe | null;
              const { token: stripeToken, error } = await stripeClient!.createToken(ibanEl as unknown as StripeIbanElement, {
                account_holder_name: accountHolderName,
                account_holder_type: businessType === 'company' ? 'company' : 'individual',
                currency: 'eur',
              });
              if (!error && stripeToken) tokenId = stripeToken.id;
            }
          } catch (e) {
            console.warn('Elements tokenization failed, will attempt fallback', e);
          }
        }

        // Fallback: if tokenId not obtained and stripePromise resolved to an instance, try createToken from raw IBAN
        if (!tokenId) {
          try {
            // Resolve stripe instance if available from the promise state
            // We stored a stripe instance earlier in state (stripeInstance) — if it's present, use it
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - older stripe typings
            const resolvedStripe = (await (stripePromiseState ?? Promise.resolve(null))) as Stripe | null;
            if (resolvedStripe) {
              // Use bank_account tokenization fallback if createToken is present
              const maybe = resolvedStripe as unknown as { createToken?: (type: string, data: Record<string, unknown>) => Promise<{ token?: { id: string } } | null> };
              if (typeof maybe.createToken === 'function') {
                const resp = await maybe.createToken('bank_account', {
                  country: 'BE',
                  currency: 'eur',
                  account_holder_name: accountHolderName,
                  account_holder_type: businessType === 'company' ? 'company' : 'individual',
                  account_number: bankAccount.iban,
                });
                if (resp && resp.token) tokenId = resp.token.id;
              }
            }
          } catch (e) {
            console.warn('Fallback tokenization failed', e);
          }
        }

  if (!tokenId) throw new Error('We konden je bankrekening niet veilig verwerken. Vernieuw de pagina en probeer opnieuw, of neem contact op als het probleem blijft bestaan.');

        payload.external_account = { token: tokenId };
      }

      // Create/update platform account with full KYC data (include external_account token)
      const onboardPayload = { ...payload };
      const accountResult = await ensureAccount(onboardPayload);
      // Keep bank fields for display, but tokenization is required for adding a payout account.
      // Save created connected account id so we can show the IBAN tokenization component.
      if (accountResult.accountId) setCreatedAccountId(accountResult.accountId);

      // Fetch Stripe status to give immediate feedback about details_submitted / charges_enabled
      try {
        const statusRes = await fetch('/api/stripe/custom/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statusRes.ok) {
          const s = await statusRes.json().catch(() => null);
          if (s?.message && typeof push === 'function') push(s.message);
        }
      } catch (e) {
        // ignore status failures
      }

      // Show Ocaso-styled toast instead of native alert
      // Use toast (push) from context; fallback to alert if push is not available
      try {
        if (typeof push === 'function') push('KYC-gegevens verzonden. We houden je op de hoogte.');
        else window.alert('KYC-gegevens verzonden. We houden je op de hoogte.');
      } catch (e) {
        window.alert('KYC-gegevens verzonden. We houden je op de hoogte.');
      }
      onSuccess?.();
    } catch (err: unknown) {
      let msg = 'Onbekende fout';
      if (err && typeof err === 'object' && 'message' in err) msg = (err as { message?: string }).message || msg;
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="w-full space-y-4" onSubmit={handleSubmit}>
  <div>
    <label htmlFor="kyc-email" className="mb-1.5 block text-sm font-medium">Gekend e-mailadres</label>
    <input id="kyc-email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="E-mailadres" />
  <p className="text-sm text-neutral-500 mt-1">Dit e-mailadres wordt gebruikt voor je account</p>
  </div>
      {/* Branch field: hide when individual (Particulier) to avoid showing it, but still include it in payload */}
      {businessType !== 'individual' ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Branche / omschrijving activiteit</span>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Bijv. Particuliere verkoop" />
          <p className="text-sm text-neutral-500 mt-1">Beschrijf je activiteit.</p>
        </div>
      ) : (
        // keep branch state populated for individuals but don't render the input
        <input type="hidden" value={branch} />
      )}
  {/* Intro copy moved to parent page to avoid duplication */}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Account type</span>
        <div className="flex gap-4 mt-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input id="type-individual" className="h-4 w-4 accent-emerald-600" type="radio" name="type" value="individual" checked={businessType === 'individual'} onChange={() => setBusinessType('individual')} />
            <span className="ml-1">Particulier</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input id="type-company" className="h-4 w-4 accent-emerald-600" type="radio" name="type" value="company" checked={businessType === 'company'} onChange={() => setBusinessType('company')} />
            <span className="ml-1">Bedrijf</span>
          </label>
        </div>
      </label>

      {businessType === 'individual' ? (
        <div className="grid grid-cols-2 gap-3">
            <div>
            <label htmlFor="kyc-first" className="mb-1.5 block text-sm font-medium">Voornaam</label>
            <input id="kyc-first" name="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Voornaam" />
          </div>
          <div>
            <label htmlFor="kyc-last" className="mb-1.5 block text-sm font-medium">Achternaam</label>
            <input id="kyc-last" name="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Achternaam" />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="kyc-company" className="mb-1.5 block text-sm font-medium">Bedrijfsnaam</label>
          <input id="kyc-company" name="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Naam bedrijf" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input id="kyc-company-number" name="company_number" value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} placeholder="KBO / Registratienummer" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
            <input id="kyc-company-vat" name="company_vat" value={companyVat} onChange={(e) => setCompanyVat(e.target.value)} placeholder="BTW nummer (optioneel)" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
            {vatVerificationMessage && (
              <p className={`text-sm mt-1 ${vatVerificationStatus === 'valid' ? 'text-green-600' : vatVerificationStatus === 'invalid' ? 'text-red-600' : 'text-neutral-500'}`}>
                {vatVerificationMessage}
              </p>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="mb-1.5 block text-sm font-medium">Eigenaars / ultimate beneficial owners</span>
              <button type="button" onClick={() => setOwners(o => [...o, { id: String(Date.now()), first_name: '', last_name: '', dob: { day: '', month: '', year: '' }, nationality: '', ownership_percentage: '', idFront: null, idBack: null }])} className="btn btn-sm btn-outline">Voeg eigenaar toe</button>
            </div>
            <div className="space-y-3 mt-3">
              {owners.map((owner, idx) => (
                <div key={owner.id} className="p-3 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <strong>Eignaar {idx + 1}</strong>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setOwners(o => o.filter(x => x.id !== owner.id))} className="text-sm text-red-600">Verwijder</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input id={`owner-first-${owner.id}`} name={`owner_first_${owner.id}`} value={owner.first_name} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, first_name: e.target.value } : x))} placeholder="Voornaam" className="w-full rounded-xl border px-3 py-2 text-sm" />
                    <input id={`owner-last-${owner.id}`} name={`owner_last_${owner.id}`} value={owner.last_name} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, last_name: e.target.value } : x))} placeholder="Achternaam" className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <input id={`owner-dob-day-${owner.id}`} name={`owner_dob_day_${owner.id}`} value={owner.dob.day} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, dob: { ...x.dob, day: e.target.value } } : x))} placeholder="DD" className="w-20 rounded-xl border px-2 py-1 text-sm" />
                    <input id={`owner-dob-month-${owner.id}`} name={`owner_dob_month_${owner.id}`} value={owner.dob.month} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, dob: { ...x.dob, month: e.target.value } } : x))} placeholder="MM" className="w-24 rounded-xl border px-2 py-1 text-sm" />
                    <input id={`owner-dob-year-${owner.id}`} name={`owner_dob_year_${owner.id}`} value={owner.dob.year} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, dob: { ...x.dob, year: e.target.value } } : x))} placeholder="YYYY" className="w-28 rounded-xl border px-2 py-1 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <input id={`owner-nat-${owner.id}`} name={`owner_nat_${owner.id}`} value={owner.nationality} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, nationality: e.target.value } : x))} placeholder="Nationaliteit (ISO)" className="w-full rounded-xl border px-3 py-2 text-sm" />
                    <input id={`owner-ownership-${owner.id}`} name={`owner_ownership_${owner.id}`} value={owner.ownership_percentage ?? ''} onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, ownership_percentage: e.target.value } : x))} placeholder="% eigendom (optioneel)" className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <input id={`ownerFront-${owner.id}`} type="file" onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, idFront: e.target.files?.[0] ?? null } : x))} className="" />
                    </div>
                    <div>
                      <input id={`ownerBack-${owner.id}`} type="file" onChange={(e) => setOwners(o => o.map(x => x.id === owner.id ? { ...x, idBack: e.target.files?.[0] ?? null } : x))} className="" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {businessType === 'individual' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="mb-1.5 block text-sm font-medium">Geboortedatum</span>
            <div className="flex gap-2">
              <input value={dob.day} onChange={(e) => setDob(d => ({ ...d, day: e.target.value }))} placeholder="DD" className="w-20 rounded-xl border px-2 py-1 text-sm" />
              <input value={dob.month} onChange={(e) => setDob(d => ({ ...d, month: e.target.value }))} placeholder="MM" className="w-24 rounded-xl border px-2 py-1 text-sm" />
              <input value={dob.year} onChange={(e) => setDob(d => ({ ...d, year: e.target.value }))} placeholder="YYYY" className="w-28 rounded-xl border px-2 py-1 text-sm" />
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Telefoon</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32..." className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Nationaliteit (ISO)</span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="BE" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium">Adres</span>
        <input value={address.line1} onChange={(e) => setAddress(a => ({ ...a, line1: e.target.value }))} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Straat en huisnummer" />
        <div className="grid grid-cols-3 gap-3 mt-3">
          <input value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Plaats" />
          <input value={address.postal_code} onChange={(e) => setAddress(a => ({ ...a, postal_code: e.target.value }))} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Postcode" />
          <input value={address.country} onChange={(e) => setAddress(a => ({ ...a, country: e.target.value }))} className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200`} placeholder="Land (ISO)" />
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Bankrekening (voor uitbetalingen)</span>
        <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Rekeningnummer (IBAN)</label>
            <div className="border rounded px-3 py-2 bg-slate-50">
              {/* Keep Stripe's element but visually integrate it; supportedCountries keeps SEPA focus */}
              <input
                value={formatIban(bankAccount.iban)}
                onChange={(e) => setBankAccount(b => ({ ...b, iban: normalizeIban(e.target.value) }))}
                placeholder="BE.."
                className="w-full bg-transparent outline-none text-sm"
                aria-label="IBAN"
              />
              {!isValidIban(bankAccount.iban) && bankAccount.iban.length > 0 && (
                <p className="text-sm text-red-600 mt-1">Vul een geldig IBAN in.</p>
              )}
            </div>
            <p className="text-sm text-neutral-600 mt-1">Vul je IBAN in zodat we uitbetalingen kunnen uitvoeren. We bewaren geen raw bankgegevens.</p>
          </div>
      </div>

      {createdAccountId && (
        <div className="mt-4">
          <AddPayoutIban
            accountId={createdAccountId as string}
            accountHolderName={businessType === 'company' ? (companyName.trim() || `${firstName} ${lastName}`.trim()) : `${firstName} ${lastName}`.trim()}
            accountHolderType={businessType}
            onDone={() => { if (typeof push === 'function') push('Bankrekening toegevoegd.'); }}
          />
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium">ID - voorkant</span>
        <div className="mt-2 flex items-center gap-3">
          <input ref={idFrontRef} id="idFront" type="file" accept="image/*,application/pdf" onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} className="hidden" />
          <button type="button" onClick={() => idFrontRef.current?.click()} className="inline-block inline-flex items-center gap-2 btn btn-sm btn-outline">
            Kies bestand
          </button>
          <span className="text-sm text-slate-600">{idFront?.name ?? 'Nog geen bestand geselecteerd'}</span>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">ID - achterkant (optioneel)</span>
        <div className="mt-2 flex items-center gap-3">
          <input ref={idBackRef} id="idBack" type="file" accept="image/*,application/pdf" onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} className="hidden" />
          <button type="button" onClick={() => idBackRef.current?.click()} className="inline-block inline-flex items-center gap-2 btn btn-sm btn-outline">
            Kies bestand
          </button>
          <span className="text-sm text-slate-600">{idBack?.name ?? 'Nog geen bestand geselecteerd'}</span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="pt-2">
        <button type="submit" disabled={busy} className="btn btn-primary w-full md:w-auto">
          {busy ? 'Verzenden...' : 'Verstuur registratie'}
        </button>
      </div>
    </form>
  );
}
