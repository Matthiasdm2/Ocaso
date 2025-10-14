'use client';

export const dynamic = 'force-dynamic';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import CheckoutForm from '@/components/CheckoutForm';
import { createClient } from '@/lib/supabaseClient';

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function CheckoutInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan'); // 'basic' or 'pro'
  const billing = searchParams.get('billing'); // 'monthly' or 'yearly'

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!plan || !billing) {
      setError('Ontbrekende plan of billing informatie');
      setLoading(false);
      return;
    }

    // Get session for auth
    const getSessionAndCreateIntent = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Niet ingelogd');
        setLoading(false);
        return;
      }
      // store email for PaymentElement defaultValues
      if (session.user?.email) {
        setUserEmail(session.user.email);
      }

      // Create PaymentIntent
      fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, billing }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setClientSecret(data.clientSecret);
          }
        })
        .catch((err) => {
          console.error('Error creating payment intent:', err);
          setError('Kon betaling niet initialiseren');
        })
        .finally(() => setLoading(false));
    };

    getSessionAndCreateIntent();
  }, [plan, billing]);

  useEffect(() => {
    // Build the shareable checkout URL on the client
    try {
      if (typeof window !== 'undefined') {
        setCheckoutUrl(window.location.href);
      }
    } catch (e) {
      // noop
    }
  }, []);

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="rounded-2xl bg-red-50 p-8 border border-red-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Configuratie fout</h2>
            <p className="text-red-700 mb-6">Stripe betalingsconfiguratie ontbreekt. Neem contact op met de beheerder.</p>
            <button
              onClick={() => window.history.back()}
              className="rounded-xl bg-red-600 px-6 py-3 text-white font-semibold hover:bg-red-700 transition"
            >
              Terug
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Betaling initialiseren...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="rounded-2xl bg-red-50 p-8 border border-red-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Fout bij betaling</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="rounded-xl bg-red-600 px-6 py-3 text-white font-semibold hover:bg-red-700 transition"
            >
              Terug
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#059669', // emerald-600
      colorBackground: '#ffffff',
      colorText: '#374151',
      colorDanger: '#dc2626',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Tab': {
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      '.Tab:hover': {
        border: '1px solid #059669',
      },
      '.Tab--selected': {
        border: '1px solid #059669',
        backgroundColor: '#ecfdf5',
      },
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        {/* Terug button */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Abonnement activeren</h1>
          <p className="text-neutral-600">
            {plan === 'basic' ? 'Basic' : 'Pro'} abonnement - {billing === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
          </p>

          {/* Shareable checkout URL */}
          {checkoutUrl && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <input
                readOnly
                value={checkoutUrl}
                className="w-full max-w-2xl rounded-md border border-neutral-200 px-3 py-2 text-sm bg-neutral-50"
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Checkout URL"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(checkoutUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  } catch (err) {
                    console.error('Copy failed', err);
                  }
                }}
                className="rounded-md bg-emerald-600 px-4 py-2 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Kopieer
              </button>
              {copied && <span className="text-sm text-emerald-700">Gekopieerd!</span>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
          <Elements key={clientSecret} stripe={stripePromise} options={options}>
            <CheckoutForm plan={plan!} billing={billing!} userEmail={userEmail} />
          </Elements>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" /></div>}>
      <CheckoutInner />
    </Suspense>
  );
}
