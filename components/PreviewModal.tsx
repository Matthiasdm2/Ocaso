"use client";

import { useEffect } from "react";

type PreviewData = {
  title: string;
  description: string;
  price?: number | string;
  condition?: string;
  allowOffers: boolean;
  minBid?: number | string;
  shippingEnabled?: boolean;
  shipping?: {
    length?: number | string;
    width?: number | string;
    height?: number | string;
    weight?: number | string;
    service?: string;
    price?: number | string;
  };
  location?: { city?: string; zip?: string; country?: string };
  images: string[];
};

export default function PreviewModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PreviewData;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const {
    title,
    description,
    price,
    condition,
    allowOffers,
    minBid,
    shippingEnabled,
    shipping,
    location,
    images = [],
  } = data;

  const main = images[0];
  const rest = images.slice(1, 6);

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="listing-preview-title"
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-[101] w-[min(1100px,96vw)] max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="listing-preview-title" className="text-xl font-semibold">
            Voorbeeld: {title || "—"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-neutral-100 focus:outline-none"
            aria-label="Sluit preview"
            title="Sluit"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {/* Images */}
          <div className="flex flex-col gap-3">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border bg-neutral-50">
              {main ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={main}
                  alt={title || "Zoekertje"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-400">
                  Geen afbeelding
                </div>
              )}
            </div>

            {rest.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {rest.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`Preview ${i + 2}`}
                    className="h-20 w-28 flex-none rounded-lg border object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">
                  {title || "—"}
                </h3>
                <div className="mt-1 text-sm text-neutral-500">
                  Staat: {condition || "—"}
                </div>
                {location?.city && (
                  <div className="mt-1 text-sm text-neutral-500">
                    Locatie: {location.city}
                    {location.zip ? ` (${location.zip})` : ""}
                    {location.country ? `, ${location.country}` : ""}
                  </div>
                )}
              </div>
              <div className="shrink-0 rounded-xl bg-neutral-50 px-4 py-2 text-right">
                <div className="text-sm text-neutral-500">Vraagprijs</div>
                <div className="text-2xl font-bold">
                  {price ? `€ ${Number(price).toLocaleString("nl-BE")}` : "—"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-1 text-sm font-medium text-neutral-600">
                Omschrijving
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                {description || "—"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-medium text-neutral-600">
                  Bieden toegestaan
                </div>
                <div className="mt-1 text-sm">
                  {allowOffers ? "Ja" : "Nee"}
                  {allowOffers && minBid && (
                    <span className="text-neutral-500">
                      {" "}
                      — minimum bod € {Number(minBid).toLocaleString("nl-BE")}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm font-medium text-neutral-600">
                  Verzending via OCASO
                </div>
                <div className="mt-1 text-sm">
                  {shippingEnabled ? "Ja" : "Nee"}
                  {shippingEnabled && shipping && (
                    <div className="mt-1 text-xs text-neutral-500">
                      {shipping.service ? `Dienst: ${shipping.service} · ` : ""}
                      {shipping.price
                        ? `+/- € ${Number(shipping.price).toLocaleString("nl-BE")}`
                        : ""}
                      <div className="mt-1">
                        {shipping.length ? `L: ${shipping.length} ` : ""}
                        {shipping.width ? `B: ${shipping.width} ` : ""}
                        {shipping.height ? `H: ${shipping.height} ` : ""}
                        {shipping.weight ? `W: ${shipping.weight}kg` : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
              Dit is een **voorbeeldweergave**. Je zoekertje wordt pas
              gepubliceerd na bevestiging.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Verder bewerken
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Ziet er goed uit
          </button>
        </div>
      </div>
    </div>
  );
}
