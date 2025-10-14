'use client';

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';

interface CheckoutFormProps {
  plan: string;
  billing: string;
  userEmail: string | null;
}

export default function CheckoutForm({ plan, billing, userEmail }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elementReady, setElementReady] = useState(false);

  // Fallback: poll until PaymentElement exists (some environments don't trigger onReady reliably)
  useEffect(() => {
    if (!elements || elementReady) return;
    let ticks = 0;
    const id = setInterval(() => {
      const el = elements.getElement(PaymentElement);
      if (el) {
        setElementReady(true);
        clearInterval(id);
      } else if (++ticks > 50) { // ~10s max
        clearInterval(id);
        setMessage('Kon betaalopties niet laden. Controleer je internetverbinding of probeer te verversen.');
      }
    }, 200);
    return () => clearInterval(id);
  }, [elements, elementReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    // Ensure the Payment Element is mounted and validated before confirming
    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement || !elementReady) {
      setMessage('Het betaalformulier is nog niet klaar. Probeer opnieuw.');
      setIsLoading(false);
      return;
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage(submitError.message || 'Controleer je gegevens en probeer opnieuw.');
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profile/business?success=true&plan=${plan}&billing=${billing}`,
      },
      redirect: 'if_required',
    });

    if (error?.type === 'card_error' || error?.type === 'validation_error') {
      setMessage(error.message || 'Er is een fout opgetreden');
    } else {
      setMessage('Er is een onverwachte fout opgetreden');
    }

    setIsLoading(false);
  };

  return (
  <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            value={userEmail || ''}
            readOnly
            className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-50 text-neutral-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Betaalgegevens
          </label>
          <PaymentElement
            id="payment-element"
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  email: userEmail || undefined,
                },
              },
            }}
            onReady={() => setElementReady(true)}
            onChange={() => {
              if (!elementReady) setElementReady(true);
            }}
          />
          {!elementReady && (
            <div className="mt-2 text-sm text-neutral-500">Betaalopties laden…</div>
          )}
        </div>
      </div>

      <button
        disabled={isLoading || !stripe || !elements || !elementReady}
        id="submit"
        className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Betaling verwerken...
          </div>
        ) : (
          `Betaal ${plan === 'basic' ? 'Basic' : 'Pro'} (${billing === 'monthly' ? 'Maandelijks' : 'Jaarlijks'})`
        )}
      </button>

      {message && (
        <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-md border border-red-200">
          {message}
        </div>
      )}
    </form>
  );
}
