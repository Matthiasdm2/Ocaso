"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { useProfile } from "@/lib/useProfile";

interface Props {
  listingId?: string | number | null;
  price?: number;
  sellerId?: string | number | null;
  allowOffers?: boolean;
  min_bid?: number;
}

export default function ClientActions({
  listingId,
  price,
  sellerId,
  allowOffers,
  min_bid,
}: Props) {
  // Zorg dat allowOffers altijd als boolean werkt
  const offersAllowed = !!allowOffers && (allowOffers === true || String(allowOffers).toLowerCase() === "true" || String(allowOffers) === "1" || String(allowOffers).toLowerCase() === "yes");
  const [showBid, setShowBid] = useState(false);
  const [bidValue, setBidValue] = useState("");
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  // Haal de ingelogde gebruiker op
  const { profile, loading } = useProfile();
  const [contactLoading, setContactLoading] = useState(false);
  // Haal het Supabase access token op
  async function getAccessToken() {
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          href={listingId ? `/checkout?listing=${listingId}` : "#"}
          className="flex-1 rounded-full bg-primary text-black px-3 py-1.5 text-sm font-semibold text-center border border-primary/30 hover:bg-primary/80 transition"
          aria-label="Koop nu"
        >
          Koop nu — {typeof price === "number" ? new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(price) : "—"}
        </Link>

        <button
          type="button"
          onClick={() => setShowBid(true)}
          className="flex-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-sm font-semibold text-center border border-emerald-200 hover:bg-emerald-100 transition"
        >
          Doe bod
        </button>

        <button
          type="button"
          disabled={contactLoading}
          onClick={useCallback(async () => {
            if (contactLoading) return;
            if (!sellerId) return;
            if (!profile) {
              if (!loading) {
                window.location.href = '/login';
              }
              return;
            }
            try {
              setContactLoading(true);
              // Token ophalen
              const { createClient } = await import("@/lib/supabaseClient");
              const supa = createClient();
              const { data: { session } } = await supa.auth.getSession();
              const token = session?.access_token;
              // Start (of vind) conversatie via API endpoint /api/messages
              const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ otherUserId: String(sellerId), listingId }),
              });
              const d = await res.json();
              if (res.status === 401 || d.error === 'unauthorized') {
                window.location.href = '/login';
                return;
              }
              if (d.conversation?.id) {
                window.dispatchEvent(new CustomEvent('ocaso:open-chat-dock', { detail: { conversationId: d.conversation.id } }));
                window.dispatchEvent(new CustomEvent('ocaso:conversation-started', {
                  detail: {
                    conversation: {
                      id: d.conversation.id,
                      participants: d.conversation.participants || [],
                      updated_at: d.conversation.created_at || new Date().toISOString(),
                      lastMessage: null,
                      unread: 0,
                      listing_id: d.conversation.listing_id || listingId || null,
                      listing: null,
                    }
                  }
                }));
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Contact start fout', e);
            } finally {
              setContactLoading(false);
            }
          }, [contactLoading, profile, loading, sellerId, listingId])}
          className="flex-1 rounded-full bg-gray-800 text-white px-3 py-1.5 text-sm font-semibold text-center border border-gray-900/40 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {contactLoading ? '...' : 'Contact'}
        </button>
      </div>
      {/* Popup bod venster */}
      {showBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-primary flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary text-center mb-2">Doe een bod</h3>
            {offersAllowed ? (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="bod" className="text-sm font-medium text-gray-700">Bedrag (€)</label>
                  <input
                    id="bod"
                    type="number"
                    min={typeof min_bid === "number" ? min_bid : 0}
                    step="0.01"
                    value={bidValue}
                    onChange={e => setBidValue(e.target.value)}
                    className="rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={typeof min_bid === "number" ? `Min. bod: €${min_bid}` : "Voer uw bod in"}
                  />
                  {typeof min_bid === "number" && (
                    <div className="text-xs text-gray-500 mt-1">Minimumbod: <span className="font-semibold">€ {min_bid}</span></div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-primary text-black px-3 py-1.5 text-sm font-semibold border border-primary/30 hover:bg-primary/80 transition"
                    onClick={async () => {
                      if (!profile || loading) {
                        setConfirmMsg("Je moet ingelogd zijn om een bod te plaatsen.");
                        return;
                      }
                      const bodBedrag = Number(bidValue);
                      if (typeof min_bid === "number" && bodBedrag < min_bid) {
                        setConfirmMsg(`Bod geweigerd: lager dan minimumbod (€${min_bid})`);
                        return;
                      }
                      // Bod plaatsen via API met access token
                      const accessToken = await getAccessToken();
                      const res = await fetch(`/listings/${listingId}/bids`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                        },
                        body: JSON.stringify({ listingId, amount: bodBedrag, bidderId: profile.id }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        setConfirmMsg(`Bod geplaatst: €${bidValue}`);
                        setBidValue("");
                      } else {
                        setConfirmMsg(result.error || "Er ging iets mis bij het plaatsen van je bod.");
                      }
                    }}
                  >
                    Plaats bod
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-gray-100 text-gray-700 px-3 py-1.5 text-sm font-semibold border border-gray-300 hover:bg-gray-200 transition"
                    onClick={() => setShowBid(false)}
                  >
                    Annuleer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-700 text-base py-8">
                Biedingen zijn niet toegestaan voor dit zoekertje.
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-gray-100 text-gray-700 px-3 py-1.5 text-sm font-semibold border border-gray-300 hover:bg-gray-200 transition"
                    onClick={() => setShowBid(false)}
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Bevestigingsmodal */}
          {confirmMsg && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-xs w-full text-center flex flex-col gap-4">
                <div className="text-lg font-semibold text-emerald-700">{confirmMsg}</div>
                <button
                  type="button"
                  className="mt-2 px-4 py-1 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
                  onClick={() => { setConfirmMsg(null); setShowBid(false); }}
                >
                  Sluiten
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}