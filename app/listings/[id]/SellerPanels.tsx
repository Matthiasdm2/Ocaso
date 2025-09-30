// app/listings/[id]/SellerPanels.tsx
import Link from "next/link";

import Avatar from "@/components/Avatar";

type Seller = {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  rating?: number | null; // 0-5
  salesCount?: number | null;
  isBusiness?: boolean | null;
  isVerified?: boolean | null;
  joinedISO?: string | null;
  responseMins?: number | null; // gemiddelde antwoordtermijn in minuten
  lastSeenISO?: string | null;
};

// We laten 'seller' optioneel zijn en vangen 'undefined' op met defaults
type Props = {
  seller?: Partial<Seller> | null;
  location?: string | null;
  coords?: { lat: number; lng: number } | null;
  shippingAvgDays?: number | null;
  cancelRatePct?: number | null;
  responseRatePct?: number | null;
};

export default function SellerPanels({
  seller,
  location,
  coords,
  shippingAvgDays,
  cancelRatePct,
  responseRatePct,
}: Props) {
  const s: Partial<Seller> = seller ?? {};

  const rating = clamp(s.rating ?? null, 0, 5);
  const sales = s.salesCount ?? null;
  const joined = s.joinedISO ? safeDate(s.joinedISO) : null;
  const response = s.responseMins ?? null;
  const responseHuman = response != null ? humanizeMinutes(response) : "—";
  const positivePct = rating != null ? Math.round((rating / 5) * 100) : null;

  const mapsSrc = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=13&output=embed`
    : location
      ? `https://www.google.com/maps?q=${encodeURIComponent(location)}&z=13&output=embed`
      : null;

  const mapsLink = coords
    ? `https://www.google.com/maps?daddr=${coords.lat},${coords.lng}`
    : location
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`
      : null;

  return (
    <div className="space-y-4">
      {/* Verkoper */}
      <section className="rounded-2xl border p-4">
        <h3 className="font-semibold mb-3">Verkoper</h3>
        <div className="flex items-center gap-3">
          <Avatar src={s.avatarUrl ?? null} name={s.name ?? undefined} size={48} rounded="full" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {s.id ? (
                <Link
                  href={`/seller/${s.id}`}
                  className="font-medium truncate hover:underline decoration-emerald-600/60 decoration-2 underline-offset-2"
                >
                  {s.name ?? "Onbekend"}
                </Link>
              ) : (
                <p className="font-medium truncate">{s.name ?? "Onbekend"}</p>
              )}
              {s.isBusiness ? (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Zakelijk
                </span>
              ) : null}
              {s.isVerified ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Vertrouwd
                </span>
              ) : null}
            </div>
            <div className="text-sm text-neutral-600">
              {location ?? "—"} {joined ? `• Lid sinds ${joined}` : ""}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <InfoPill
            label="Rating"
            value={
              rating != null ? `${stars(rating)} ${rating.toFixed(1)}` : "—"
            }
          />
          <InfoPill label="Antwoordtermijn" value={responseHuman} />
          <InfoPill label="Verkopen" value={sales != null ? `${sales}` : "—"} />
          <InfoPill
            label="Laatst online"
            value={s.lastSeenISO ? timeAgo(s.lastSeenISO) : "—"}
          />
        </div>

        {/* Kaartje (klein) */}
        {mapsSrc && (
          <div className="mt-4">
            <div className="rounded-xl overflow-hidden border">
              <iframe
                title="Locatie verkoper"
                src={mapsSrc}
                width="100%"
                height="160"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {mapsLink && (
              <div className="mt-2 flex gap-2">
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  📍 Open in Google Maps
                </a>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Verkopen & betrouwbaarheid */}
      <section className="rounded-2xl border">
        <div className="px-4 py-3 border-b font-semibold">
          Verkopen & betrouwbaarheid
        </div>
        <dl className="divide-y">
          <Row k="Aantal verkopen" v={sales != null ? `${sales}` : "—"} />
          <Row
            k="Positieve reviews"
            v={positivePct != null ? `${positivePct}%` : "—"}
          />
          <Row k="Annuleringsratio" v={percentOrDash(cancelRatePct)} />
          <Row
            k="Gem. verzendtijd"
            v={shippingAvgDays != null ? `${shippingAvgDays} dagen` : "—"}
          />
          <Row k="Responsratio" v={percentOrDash(responseRatePct)} />
          <Row
            k="Type verkoper"
            v={s.isBusiness ? "Zakelijk" : "Particulier"}
          />
        </dl>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-3">
      <dt className="col-span-1 text-sm text-neutral-500">{k}</dt>
      <dd className="col-span-2 text-sm">{v}</dd>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

// ---------- helpers ----------
function clamp(n: number | null, min: number, max: number) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}
function safeDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("nl-BE");
  } catch {
    return null;
  }
}
function humanizeMinutes(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} u`;
  const d = Math.round(h / 24);
  return `${d} d`;
}
function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / (1000 * 60));
  if (m < 60) return `${m} min geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} u geleden`;
  const d = Math.floor(h / 24);
  return `${d} d geleden`;
}
function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
function percentOrDash(v?: number | null) {
  return v == null ? "—" : `${Math.round(v)}%`;
}
