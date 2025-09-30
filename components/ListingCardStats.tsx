"use client";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export default function ListingCardStats({ id, initViews = 0, initFavorites = 0 }: { id: string; initViews?: number; initFavorites?: number }) {
  const supabase = createClient();
  const [stats, setStats] = useState<{ views: number; favorites: number }>({ views: initViews, favorites: initFavorites });

  useEffect(() => {
    let mounted = true;
  fetch(`/api/listings/${id}/stats`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error("stats fetch failed");
        return res.json();
      })
      .then((d) => {
        if (!mounted) return;
        setStats({ views: Number(d.views ?? initViews), favorites: Number(d.favorites ?? initFavorites) });
        
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") console.debug("ListingCardStats -> fetch error", id, err?.message ?? err);
      });
    return () => {
      mounted = false;
    };
  }, [id, initViews, initFavorites]);

  // subscribe to changes so list cards update live (views + favorites_count)
  useEffect(() => {
    let channel: { unsubscribe?: () => void } | null = null;
    try {
      channel = supabase
        .channel(`listing-views-card-${id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "listings", filter: `id=eq.${id}` },
          (payload: unknown) => {
            const p = payload as { new?: { views?: unknown; favorites_count?: unknown } } | null;
            const newViews = p?.new?.views;
            const newFavorites = p?.new?.favorites_count;
            if (typeof newViews === "number" || typeof newFavorites === "number") {
              setStats((s) => ({ views: Number(newViews ?? s.views), favorites: Number(newFavorites ?? s.favorites) }));
            }
          }
        )
        .subscribe();
    } catch (e) {
      // ignore subscribe error in production
    }
    return () => {
      try {
        if (channel && typeof channel.unsubscribe === "function") channel.unsubscribe();
      } catch (e) {
        /* ignore */
      }
    };
  }, [id, supabase]);

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-700">
      <span className="inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0 4.556 4.694 8.25 9.75 8.25s9.75-3.694 9.75-8.25c0-4.556-4.694-8.25-9.75-8.25S2.25 7.444 2.25 12z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {stats.views}
      </span>
      <span className="inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-3 h-3">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        {stats.favorites}
      </span>
    </div>
  );
}
