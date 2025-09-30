"use client";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

import FavoriteButton from "./FavoriteButton";

export default function ListingStats({ id, views = 0, favorites = 0 }: { id: string; views?: number; favorites?: number }) {
  const [stats, setStats] = useState<{ views: number; favorites: number }>({ views, favorites });
  useEffect(() => {
    // Registreer een view; realtime update van listings zal de teller bijwerken.
    fetch(`/api/listings/${id}/view`, { method: "POST", credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          res.text().then(t => console.error('View POST failed', { status: res.status, text: t })).catch(() => console.error('View POST failed', { status: res.status }));
          throw new Error("view POST failed");
        }
        return res.json();
      })
      .then((data) => {
        if (typeof data.views === "number") {
          setStats((s) => ({ ...s, views: Number(data.views) }));
        }
      })
      .catch(() => {});
  }, [id, views, favorites]);
  const handleFavorite = async (favorited: boolean) => {
    // Optimistic local update for snappy UI
    setStats((s) => ({ ...s, favorites: Math.max(0, s.favorites + (favorited ? 1 : -1)) }));
    // Geen HTTP-fallback meer; realtime van listings zal het definitieve getal leveren.
  };
  useEffect(() => {
    const chan = supabase
      .channel(`listing:updates:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${id}` }, (payload: { new?: { views?: unknown; favorites_count?: unknown } }) => {
        const nv = payload.new?.views;
        const nf = payload.new?.favorites_count;
        setStats((s) => ({
          views: typeof nv === 'number' ? nv : s.views,
          favorites: typeof nf === 'number' ? nf : s.favorites,
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [id]);
  return (
    <div className="flex items-center gap-2 text-xs text-white bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
      <div className="flex items-center gap-1">
        <Eye className="h-3 w-3 text-white" aria-hidden />
        <span data-testid={`listing-views-${id}`} aria-live="polite" className="min-w-[2ch]">
          {typeof stats.views === "number" ? stats.views : 0}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <FavoriteButton id={id} onFavorite={handleFavorite} />
        <span>{stats.favorites}</span>
      </div>
    </div>
  );
}
