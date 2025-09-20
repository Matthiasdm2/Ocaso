// Helper om alle truthy waarden te accepteren
function isOfferAllowed(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return !!val;
}
// app/listings/[id]/ClientActions.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function ClientActions({
  listingId,
  title,
  price,
  sellerId,
  allowOffers,
}: {
  listingId: string;
  title: string;
  price: number;
  sellerId: string | null;
  allowOffers: boolean | string | number;
}) {
  const [busy, setBusy] = useState<"offer" | "pay" | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [offer, setOffer] = useState<string>("");

  async function startCheckout() {
    try {
      setBusy("pay");
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, title, price }),
      });
      if (!res.ok) throw new Error("Checkout request failed");
      const data = await res.json();
      if (!data?.url) throw new Error("Geen redirect URL ontvangen");
      window.location.href = data.url;
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submitOffer() {
    const amount = Number(offer.replace(",", "."));
    if (!amount || amount <= 0) {
      alert("Geef een geldig bod in (bv. 120 of 120,50)");
      return;
    }
    try {
      setBusy("offer");
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, amount }),
      });
      if (!res.ok) throw new Error("Bod plaatsen mislukt");
      setShowOffer(false);
      setOffer("");
      alert("Je bod is verzonden naar de verkoper.");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Rij met Koop nu + Doe een bod (zelfde stijl & breedte) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={startCheckout}
          disabled={busy === "pay"}
          className="flex-1 rounded-xl bg-primary text-black px-4 py-3 font-medium hover:opacity-90 disabled:opacity-60"
        >
          {busy === "pay" ? "Bezig…" : "Koop nu"}
        </button>

        {isOfferAllowed(allowOffers) && (
          <button
            onClick={() => setShowOffer(true)}
            disabled={busy === "offer"}
            className="flex-1 rounded-xl bg-primary text-black px-4 py-3 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {busy === "offer" ? "Verzenden…" : "Doe een bod"}
          </button>
  )}
      </div>

      {/* Chat knop onderaan */}
      <div className="mt-3">
        <Link
          href={
            sellerId
              ? `/chat/${encodeURIComponent(sellerId)}?listingId=${encodeURIComponent(listingId)}`
              : `/chat?listingId=${encodeURIComponent(listingId)}`
          }
          className="block w-full text-center rounded-xl border px-4 py-3 font-medium hover:bg-neutral-50"
        >
          Chat met verkoper
        </Link>
      </div>

      {/* Modaal voor bod */}
      {showOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold">Bod uitbrengen</h4>
            <p className="mt-1 text-sm text-gray-600">Vul je bod in (EUR).</p>
            <input
              inputMode="decimal"
              placeholder="vb. 120,00"
              className="mt-3 w-full rounded-xl border px-3 py-2"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowOffer(false)}
                className="rounded-xl border px-4 py-2"
              >
                Annuleer
              </button>
              <button
                onClick={submitOffer}
                disabled={busy === "offer"}
                className="ml-auto rounded-xl bg-primary text-black px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
              >
                Verzend bod
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
