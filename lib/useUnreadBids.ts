"use client";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    __ocasoListingsCache?: Array<{ id?: string; bids?: number | null; metrics?: { bids?: number | null } }>;
  }
}

import { createClient } from "@/lib/supabaseClient";

/**
 * Returns the total unread bids across the user's listings, based on
 * diff between current bids count and local 'last seen' map.
 * Lightweight: fetches listings metrics and compares locally.
 */
export function useUnreadBids() {
  const supabase = createClient();
  const [total, setTotal] = useState(0); // unread total (back-compat)
  const [bidsTotal, setBidsTotal] = useState(0); // total bids across listings
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let primed = false;
    async function load(explicit?: boolean) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (active) { setTotal(0); setReady(true); } return; }

        // Attach access token if present
        const headers: Record<string, string> = {};
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        } catch { /* ignore */ }

        let items: Array<{ id?: string; metrics?: { bids?: number | null } } & { bids?: number | null }> = [];
        // Als listings al geladen zijn door listings page (event), gebruik die eerst om dubbele fetch te voorkomen
        if (!explicit && window.__ocasoListingsCache) {
          items = window.__ocasoListingsCache;
          primed = true;
        } else {
          const url = `/api/profile/listings?seller_id=${encodeURIComponent(user.id)}&include=metrics=1`;
          const r = await fetch(url, { cache: 'no-store', headers });
          if (!r.ok) throw new Error(`Server ${r.status}`);
          const d = await r.json();
          items = d.items || [];
        }
        const ids = items.map((x) => x.id).filter(Boolean) as string[];
        // Fetch server-side last seen map (RLS restricts to current user)
        const readsMap: Record<string, number> = {};
        if (ids.length) {
          type ReadRow = { listing_id: string; last_seen_count: number | null };
          const { data: reads } = await supabase
            .from('listing_bid_reads')
            .select('listing_id,last_seen_count')
            .in('listing_id', ids);
          (reads as ReadRow[] | null || []).forEach((r) => {
            if (r?.listing_id) readsMap[r.listing_id] = r.last_seen_count ?? 0;
          });
        }
        // Merge in localStorage snapshot (covers immediate refresh before server upsert finishes)
        let localMap: Record<string, number> = {};
        try {
          if (typeof window !== 'undefined') {
            const raw = window.localStorage.getItem('ocaso:lastSeenBids');
            if (raw) localMap = JSON.parse(raw) || {};
          }
        } catch { /* ignore parse */ }
        let sum = 0;
        let sumBids = 0;
        for (const it of items) {
          const id = it.id || '';
          if (!id) continue;
          const bids = (it.bids ?? it.metrics?.bids) ?? 0;
          sumBids += bids;
          // Base is the max of server persisted last_seen_count and local optimistic map.
          const persisted = readsMap[id];
          const optimistic = localMap[id];
          const persistedNum = typeof persisted === 'number' ? persisted : null;
          const optimisticNum = typeof optimistic === 'number' ? optimistic : null;
          let base: number;
          if (persistedNum !== null) {
            base = Math.max(persistedNum, optimisticNum ?? -Infinity);
          } else {
            base = optimisticNum ?? 0;
          }
          if (bids > base) sum += (bids - base);
        }
        if (active) { setTotal(sum); setBidsTotal(sumBids); }
      } catch {
        if (active) setTotal(0);
      } finally {
        if (active) setReady(true);
      }
    }
    // Event listener voor vooraf geladen listings
    function onListingsLoaded(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.items && Array.isArray(detail.items)) {
  window.__ocasoListingsCache = detail.items;
        if (!primed) load(true); // herbereken unread op verse data
      }
    }
    window.addEventListener('ocaso:listings-loaded', onListingsLoaded as EventListener);
    load();
    const id = window.setInterval(() => load(), 5000);
    const onSeen = () => load(true);
    window.addEventListener('ocaso:bids-seen-changed', onSeen as EventListener);
    return () => { active = false; clearInterval(id); window.removeEventListener('ocaso:bids-seen-changed', onSeen as EventListener); window.removeEventListener('ocaso:listings-loaded', onListingsLoaded as EventListener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return { total, bidsTotal, ready };
}
