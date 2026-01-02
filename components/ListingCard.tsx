// components/ListingCard.tsx
import Link from "next/link";

import RatingStars from "@/components/RatingStars";
import { formatPrice } from "@/lib/formatPrice";

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

export default function ListingCard({ listing, item, reviewAvg, reviewCount, compact = false, businessHighlight = false, noClampTitle = false }: { listing?: Listing; item?: Listing; reviewAvg?: number; reviewCount?: number; compact?: boolean; businessHighlight?: boolean; noClampTitle?: boolean }) {
  const listingData = listing ?? item!;
  const firstImage =
    Array.isArray(listingData.images) && listingData.images.length > 0
      ? listingData.images[0]
      : undefined;

  return (
  <Link
	href={`/listings/${listingData.id}`}
      className={[
        "group relative block bg-white border border-gray-200 rounded-lg transition-all duration-200 hover:border-gray-300 hover:shadow-md overflow-hidden",
        compact && "rounded-md",
        businessHighlight ? "border-amber-400 ring-1 ring-amber-300/40" : ""
      ].filter(Boolean).join(" ")}
    >
      {businessHighlight && (
        <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Pro
        </div>
      )}
      <div className={["w-full overflow-hidden bg-gray-50 relative", compact ? "aspect-square" : "aspect-square"].join(" ") }>
        {firstImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${firstImage}?t=${Date.now()}`}
            alt={listingData.title}
            className={[
              "h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]",
              compact && "group-hover:scale-[1.02]"
            ].filter(Boolean).join(" ")}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 bg-gray-50">
            <span className="text-xs">Geen afbeelding</span>
          </div>
        )}
      </div>
      <div className={[
        "flex flex-col",
        compact ? "p-2 gap-1" : "p-3 gap-2"
      ].join(" ")}>
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className={[
            "font-medium text-gray-900",
            compact ? "text-xs leading-tight" : "text-sm leading-tight",
            noClampTitle ? "" : "line-clamp-2"
          ].join(" ") }>
            {listingData.title}
          </h3>
          {!compact && typeof reviewAvg === 'number' && reviewCount && reviewCount > 0 && (
            <div className="inline-flex items-center gap-1 mt-1">
              <RatingStars rating={reviewAvg} size={10} />
              <span className="text-xs text-gray-600">{reviewAvg.toFixed(1)} ({reviewCount})</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          <div className={[
            "font-bold text-gray-900",
            compact ? "text-xs" : "text-base"
          ].join(" ")}>
            {formatPrice(listingData.price)}
          </div>
          {!compact && listingData.created_at && (
            <span className="text-xs text-gray-500">
              {new Date(listingData.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
