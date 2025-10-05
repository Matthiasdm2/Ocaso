"use client";
import { useEffect, useRef, useState } from "react";

import type { Listing } from "@/lib/types";

import ListingCard from "./ListingCard";

/**
 * Haalt batches van 24 items op via /api/home (recommended stream).
 * cursor = 0,1,2,...
 */
export default function InfiniteGrid() {
  const [items, setItems] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  async function loadMore(nextCursor: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/home?cursor=${nextCursor}`, { cache: "no-store" });
      const data = await res.json();
      const batch: Listing[] = (data?.recommended ?? []).map((x: Listing) => ({
        id: x.id,
        title: x.title,
        price: x.price,
        location: x.location,
        state: x.state,
        main_photo: x.main_photo,
        images: x.images ?? [],
        created_at: x.created_at,
      }));
      if (!batch.length) {
        setDone(true);
      } else {
        setItems((prev) => [...prev, ...batch]);
        setCursor(nextCursor);
      }
    } catch (e) {
      console.error("InfiniteGrid load error", e);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eerste batch
    loadMore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ref.current || done) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting && !loading) {
        await loadMore(cursor + 1);
      }
    }, { rootMargin: "400px 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [cursor, loading, done]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        {items.map((it) => (
          <ListingCard key={`${it.id}-${it.created_at ?? ""}`} item={it} />
        ))}
      </div>
      <div ref={ref} className="text-center py-6 text-sm text-gray-500">
        {done ? "Alles geladen" : loading ? "Laden…" : "Scroll voor meer"}
      </div>
    </div>
  );
}
