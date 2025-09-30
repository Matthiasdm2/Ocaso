/* eslint-disable simple-import-sort/imports */
"use client";
import { useToast } from '@/components/Toast';
import { Elements, IbanElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeError, StripeIbanElement } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

type Props = {
  accountId: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  currency?: 'eur';
  country?: string;
  onDone?: () => void;
};

function Inner(props: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { push } = useToast();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-clear messages after 5s
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  async function addIban() {
    if (!stripe || !elements) return;
    setBusy(true);
    setMsg(null);

    const ibanElement = elements.getElement(IbanElement);
    if (!ibanElement) {
      setMsg('Vul een geldig IBAN in.');
      setBusy(false);
      return;
    }

  const stripeClient = stripe as Stripe | null;
  const { token, error } = await stripeClient!.createToken(ibanElement as unknown as StripeIbanElement, {
      currency: props.currency ?? 'eur',
      account_holder_name: props.accountHolderName,
      account_holder_type: props.accountHolderType,
    });

    if (error || !token) {
      const se = error as StripeError | undefined;
      setMsg(se?.message || 'We konden je bankrekening niet veilig verwerken. Vernieuw de pagina en probeer opnieuw, of neem contact op als het probleem blijft bestaan.');
      setBusy(false);
      return;
    }

    const res = await fetch('/api/stripe/custom/external-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: props.accountId, bankToken: token.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(json.error || 'We konden je bankrekening niet veilig verwerken. Vernieuw de pagina en probeer opnieuw, of neem contact op als het probleem blijft bestaan.');
    } else {
      // Use toast for persistent UI and clear local message
      if (typeof push === 'function') push('Bankrekening toegevoegd.');
      else setMsg('Rekening succesvol toegevoegd.');
      props.onDone?.();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3 p-4 border rounded-2xl">
      <label className="block text-sm">IBAN</label>
      <div className="border rounded px-3 py-2">
        <IbanElement options={{ supportedCountries: ['SEPA'] }} />
      </div>
      <button
        onClick={addIban}
        disabled={busy || !stripe || !elements}
        className="w-full rounded-2xl bg-black text-white py-2"
      >
        {busy ? 'Toevoegen…' : 'Bankrekening toevoegen'}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

export default function AddPayoutIban(props: Props) {
  const [stripePromiseState, setStripePromiseState] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || stripePromiseState) return;
    (async () => {
      try {
        const mod = await import('@stripe/stripe-js');
        const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!key) {
          setStripePromiseState(null);
          return;
        }
        setStripePromiseState(mod.loadStripe(key));
      } catch (e) {
        console.warn('Stripe init failed', e);
        setStripePromiseState(null);
      }
    })();
  }, [stripePromiseState]);

  return (
    <Elements stripe={stripePromiseState} options={{ appearance: { theme: 'stripe' } }}>
      <Inner {...props} />
    </Elements>
  );
}
