"use client";
import { CreditCard, X } from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

export default function CreditsWidget() {
  const [modalOpen, setModalOpen] = useState(false);
  const { profile } = useProfile();
  const supabase = createClient();

  async function buyCredits(amount: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-credits-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          credits: amount,
          buyerType: 'consumer', // or determine based on user type
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Fout bij het starten van betaling: ${error.error}`);
        setModalOpen(false);
        return;
      }

      const { url } = await response.json();
      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        alert('Kon checkout URL niet verkrijgen.');
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Error buying credits:', error);
      alert('Fout bij het kopen van credits.');
      setModalOpen(false);
    }
  }

  return (
    <>
      {/* Credits Widget - Centered on page */}
      <div className="flex justify-center py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-sm w-full">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-semibold text-gray-900">Ocaso Credits</span>
            </div>
            <div className="text-3xl font-bold text-primary mb-1">
              {profile?.ocasoCredits || 0}
            </div>
            <div className="text-gray-600 text-sm mb-4">beschikbare credits</div>
            <button
              onClick={() => setModalOpen(true)}
              className="w-full bg-primary text-black py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Credits Kopen
            </button>
          </div>
        </div>
      </div>

      {/* Credits Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Ocaso Credits</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {profile?.ocasoCredits || 0}
                </div>
                <div className="text-gray-600 text-lg">beschikbare credits</div>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="text-center">
                <div className="text-gray-600 mb-6">
                  <div className="font-medium mb-2">Waarom credits kopen?</div>
                  <div className="text-sm">Genereer QR-codes voor betalingen zonder betaalterminal</div>
                </div>
              </div>

              {/* Savings Banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-green-700 font-medium text-sm">
                  💰 Bespaar 20% met het grote pakket!
                </div>
              </div>

              <div className="grid gap-4">
                {/* Small Package */}
                <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-2xl">10</div>
                        <div className="text-gray-600">Credits</div>
                      </div>
                      <div className="text-2xl font-bold text-primary">€1,00</div>
                      <div className="text-sm text-gray-500">€0,10 per credit</div>
                    </div>
                    <button
                      onClick={() => buyCredits(10)}
                      className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                      Kopen
                    </button>
                  </div>
                </div>

                {/* Large Package - Featured */}
                <div className="relative border-2 border-primary rounded-xl p-5 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-black px-4 py-1 rounded-full text-sm font-bold shadow-md">
                      🔥 MEEST GEKOZEN
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-2xl">25</div>
                        <div className="text-gray-600">Credits</div>
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                          20% korting
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-primary">€5,00</div>
                      <div className="text-sm text-gray-500">€0,20 per credit</div>
                    </div>
                    <button
                      onClick={() => buyCredits(25)}
                      className="bg-primary text-black px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      Kopen
                    </button>
                  </div>
                </div>
              </div>

              {/* Usage Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Hoe werken credits?</div>
                    <div>1 credit = 1 QR-code voor betalingen. Verkrijgbaar bij Ocaso Shops.</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  );
}
