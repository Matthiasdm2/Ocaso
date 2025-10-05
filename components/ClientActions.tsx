"use client";

import { useCallback, useState } from "react";

import { useProfile } from "@/lib/useProfile";

interface Props {
  listingId?: string | number | null;
  price?: number;
  sellerId?: string | number | null;
  sellerKycCompleted?: boolean;
  allowOffers?: boolean;
  min_bid?: number;
  stock?: number;
}

export default function ClientActions({
  listingId,
  price,
  sellerId,
  sellerKycCompleted,
  allowOffers,
  min_bid,
  stock = 1,
}: Props) {
  // Zorg dat allowOffers altijd als boolean werkt
  const offersAllowed = !!allowOffers && (allowOffers === true || String(allowOffers).toLowerCase() === "true" || String(allowOffers) === "1" || String(allowOffers).toLowerCase() === "yes");
  const [showBid, setShowBid] = useState(false);
  const [bidValue, setBidValue] = useState("");
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  // Haal de ingelogde gebruiker op
  const { profile, loading } = useProfile();
  const [contactLoading, setContactLoading] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [shippingMode, setShippingMode] = useState<"pickup" | "ship">("pickup");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrCountry, setAddrCountry] = useState("BE");

  type ShippingPayload = {
    mode: "pickup" | "ship";
    contact?: { name: string; email: string; phone?: string };
    address?: { line1: string; postal_code: string; city: string; country: string };
  };

  const proceedToPayment = useCallback(async () => {
    if (!listingId) return;
    
    // Check stock availability
    if (quantity > stock) {
      alert(`Er zijn slechts ${stock} stuks beschikbaar. Pas de hoeveelheid aan.`);
      return;
    }
    
    if (shippingMode === "ship") {
      if (!contactName || !contactEmail || !addrLine1 || !addrPostal || !addrCity || !addrCountry) {
        alert("Vul alle verzendgegevens in (naam, e-mail, adres, postcode, stad, land)");
        return;
      }
    }
    try {
      setPayBusy(true);
      const payload: { listingId: string; quantity: number; shipping: ShippingPayload } = {
        listingId: String(listingId),
        quantity,
        shipping: { mode: shippingMode },
      };
      if (shippingMode === "ship") {
        payload.shipping.contact = { name: contactName, email: contactEmail, phone: contactPhone };
        payload.shipping.address = { line1: addrLine1, postal_code: addrPostal, city: addrCity, country: addrCountry };
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Checkout mislukt");
      }
      const data = await res.json();
      if (!data?.url) throw new Error("Geen redirect URL ontvangen");
      window.location.href = data.url;
    } catch (e) {
      alert((e as Error).message || "Kan betaalpagina niet openen");
    } finally {
      setPayBusy(false);
    }
  }, [listingId, shippingMode, contactName, contactEmail, contactPhone, addrLine1, addrPostal, addrCity, addrCountry, quantity, stock]);

  // Vraag betaalverzoek via chat als er geen Stripe is
  const requestPaymentViaChat = useCallback(async () => {
    if (!sellerId || !listingId) return;
    try {
      setPayBusy(true);
      // Zorg dat user ingelogd is
      const { createClient } = await import("@/lib/supabaseClient");
      const supa = createClient();
      const { data: { session } } = await supa.auth.getSession();
      const token = session?.access_token;
      if (!token) { window.location.href = "/login"; return; }

      // Vraag server om een betalingsverzoek bericht te sturen
      // Bij ophalen (pickup) geen label/extra return in chat
      const r = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: String(listingId), shipping: { mode: shippingMode } }),
      });
      const d = await r.json();
      if (!r.ok || !d?.ok) {
        const detail = d?.detail ? `: ${String(d.detail)}` : '';
        throw new Error((d?.error || 'Kon verzoek niet versturen') + detail);
      }
      const conversationId: string = d.conversationId;

      // Open de chat dock direct
      try {
        window.dispatchEvent(new CustomEvent('ocaso:open-chat-dock', { detail: { conversationId } }));
      } catch { /* ignore */ }

      setShowCheckoutModal(false);
    } catch (e) {
      alert((e as Error)?.message || 'Kon geen betaalverzoek sturen');
    } finally {
      setPayBusy(false);
    }
  }, [sellerId, listingId, shippingMode]);
  // Haal het Supabase access token op
  async function getAccessToken() {
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }
  return (
    <>
      {/* Quantity selector */}
      {stock > 1 && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aantal: <span className="text-sm text-gray-500">(Max {stock} beschikbaar)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={stock}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setQuantity(Math.max(1, Math.min(stock, val)));
              }}
              className="w-16 text-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => setQuantity(Math.min(stock, quantity + 1))}
              disabled={quantity >= stock}
              className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={payBusy || !listingId}
          onClick={() => setShowCheckoutModal(true)}
          className="flex-1 rounded-full bg-primary text-black px-3 py-1.5 text-sm font-semibold text-center border border-primary/30 hover:bg-primary/80 transition disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Koop nu"
        >
          {payBusy ? "Bezig…" : `Koop nu — ${typeof price === "number" ? new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(price * quantity) : "—"}`}
        </button>

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
                    <div className="text-sm text-gray-500 mt-1">Minimumbod: <span className="font-semibold">€ {min_bid}</span></div>
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

      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold">Kies leveringsmethode</h4>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shipmode"
                  value="pickup"
                  checked={shippingMode === "pickup"}
                  onChange={() => setShippingMode("pickup")}
                />
                <span>Afhalen</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shipmode"
                  value="ship"
                  checked={shippingMode === "ship"}
                  onChange={() => setShippingMode("ship")}
                />
                <span>Verzenden</span>
              </label>
            </div>

            {shippingMode === "ship" && (
              <div className="mt-6 grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ship-name" className="block text-sm text-gray-700">Naam</label>
                    <input id="ship-name" name="ship_name" className="mt-1 w-full rounded-lg border px-3 py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="ship-email" className="block text-sm text-gray-700">E-mail</label>
                    <input id="ship-email" name="ship_email" type="email" className="mt-1 w-full rounded-lg border px-3 py-2" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ship-phone" className="block text-sm text-gray-700">Telefoon</label>
                    <input id="ship-phone" name="ship_phone" className="mt-1 w-full rounded-lg border px-3 py-2" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label htmlFor="ship-line1" className="block text-sm text-gray-700">Adres (straat + nr.)</label>
                  <input id="ship-line1" name="ship_line1" className="mt-1 w-full rounded-lg border px-3 py-2" value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="ship-postal" className="block text-sm text-gray-700">Postcode</label>
                    <input id="ship-postal" name="ship_postal" className="mt-1 w-full rounded-lg border px-3 py-2" value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="ship-city" className="block text-sm text-gray-700">Gemeente/Stad</label>
                    <input id="ship-city" name="ship_city" className="mt-1 w-full rounded-lg border px-3 py-2" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label htmlFor="ship-country" className="block text-sm text-gray-700">Land</label>
                  <select id="ship-country" name="ship_country" className="mt-1 w-full rounded-lg border px-3 py-2" value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)}>
                    <option value="BE">België</option>
                    <option value="NL">Nederland</option>
                    <option value="FR">Frankrijk</option>
                    <option value="DE">Duitsland</option>
                  </select>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2"
                onClick={() => setShowCheckoutModal(false)}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="ml-auto rounded-lg bg-primary text-black px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
                disabled={payBusy}
                onClick={sellerKycCompleted ? proceedToPayment : requestPaymentViaChat}
              >
                {payBusy ? "Even geduld…" : (sellerKycCompleted ? "Ga naar betalen" : "Stuur betaalverzoek")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}