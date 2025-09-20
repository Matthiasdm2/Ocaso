// components/ListingCard.tsx
import dynamic from "next/dynamic";
import Link from "next/link";

import FavoriteButton from "./FavoriteButton";

const ListingCardStats = dynamic(() => import("./ListingCardStats"), { ssr: false });

type Listing = {
  id: string;
  title: string;
  price: number | string;
  images?: string[] | null;
  created_at?: string | null;
  views?: number | null;
  favorites?: number | null;
  favorites_count?: number | null;
};

function toCurrency(value: number | string, locale = "nl-BE", currency = "EUR") {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return value.toString();
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
}

export default function ListingCard({ listing, item, reviewAvg, reviewCount, compact = false, businessHighlight = false }: { listing?: Listing; item?: Listing; reviewAvg?: number; reviewCount?: number; compact?: boolean; businessHighlight?: boolean }) {
  const listingData = listing ?? item!;
  const firstImage =
    Array.isArray(listingData.images) && listingData.images.length > 0
      ? listingData.images[0]
      : undefined;

  return (
  <Link
	href={`/listings/${listingData.id}`}
      className={[
        "group relative block rounded-2xl border bg-white shadow-sm transition hover:shadow-md",
        compact && "rounded-xl",
        businessHighlight ? "border-amber-400 shadow-md ring-1 ring-amber-300/40" : "border-neutral-200"
      ].filter(Boolean).join(" ")}
    >
      {businessHighlight && (
        <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Pro
        </div>
      )}
      <div className={["w-full overflow-hidden bg-neutral-100", compact ? "aspect-square rounded-t-xl" : "aspect-[4/3] rounded-t-2xl"].join(" ") }>
        {firstImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt={listingData.title}
            className={[
              "h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]",
              compact && "group-hover:scale-[1.02]"
            ].filter(Boolean).join(" ")}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            Geen afbeelding
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <div className="rounded-full bg-white/80 backdrop-blur px-2 py-1 shadow-sm hover:bg-white transition">
            <FavoriteButton id={listingData.id} />
          </div>
        </div>
      </div>
      <div className={[
        "flex items-start justify-between gap-3",
        compact ? "p-2.5" : "p-3"
      ].join(" ")}>
        <div className="min-w-0 flex-1">
          <h3 className={["font-medium text-neutral-900 mb-1 line-clamp-2", compact ? "text-[11px] leading-tight" : "text-sm"].join(" ") }>
            {listingData.title}
          </h3>
          {!compact && typeof reviewAvg === 'number' && reviewCount && reviewCount > 0 && (
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <span>{reviewAvg.toFixed(1)}</span>
              <span className="text-amber-500">★</span>
              <span className="text-amber-600">({reviewCount})</span>
            </div>
          )}
          {!compact && listingData.created_at ? (
            <p className="mt-1 text-xs text-neutral-500">
              {new Date(listingData.created_at).toLocaleDateString("nl-BE")}
            </p>
          ) : null}
          {/* stats: views + favorites — client-side fetch to keep numbers fresh */}
          <div className={compact ? "mt-1" : ""}>
            <ListingCardStats id={listingData.id} initViews={listingData.views ?? 0} initFavorites={listingData.favorites_count ?? listingData.favorites ?? 0} />
          </div>
        </div>
        <div className={[
          "shrink-0 rounded-lg bg-neutral-900 font-semibold text-white",
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
        ].join(" ")}>{toCurrency(listingData.price)}</div>
      </div>
    </Link>
  );
}
