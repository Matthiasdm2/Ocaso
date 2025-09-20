import Image from "next/image";
import Link from "next/link";

import type { Listing } from "@/lib/types";

export default function ListingRow({ item }: { item: Listing }) {
  return (
    <Link
      href={`/listings/${item.id}`}
      className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition"
    >
      <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {(item.main_photo || (item.images && item.images.length > 0 && item.images[0])) && (
          <Image
            src={item.main_photo || (item.images && item.images.length > 0 ? item.images[0] : "")}
            alt={item.title}
            fill={true}
            className="object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium line-clamp-1">{item.title}</div>
        <div className="text-xs text-primary font-bold mb-1">Zoekertje #{item.listing_number}</div>
        <div className="text-sm text-gray-600 line-clamp-2">
          {item.description}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {item.location} • {item.state}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">€ {item.price.toFixed(0)}</div>
      </div>
    </Link>
  );
}
