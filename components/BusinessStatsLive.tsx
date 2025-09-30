"use client";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export interface BusinessStatsLiveProps {
  businessId: string;
  initial: {
    totalListings?: number;
    views?: number;
    bids?: number;
  } | null | undefined;
  fallbackListingsCount?: number;
}

export default function BusinessStatsLive({ businessId, initial, fallbackListingsCount = 0 }: BusinessStatsLiveProps) {
  console.log('[BusinessStatsLive] Rendered with businessId:', businessId, 'initial:', initial);
  const supabase = createClient();
  interface DebugListing { id: string; status?: string | null; views?: unknown; bids?: unknown }
  const [stats, setStats] = useState<{ totalListings?: number; views?: number; bids?: number; fallback?: boolean; _debugListings?: DebugListing[] } | null | undefined>(initial);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initial && Object.keys(initial).length ? new Date() : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.debug('[BusinessStatsLive] Initial fetch start', { businessId, initial });
        const debugParam = typeof window !== 'undefined' && window.location.search.includes('statsDebug=1') ? '?debug=1' : '';
        const res = await fetch(`/api/business/${businessId}/stats${debugParam}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (json && json.error) throw new Error(json.error);
        if (!json || typeof json !== 'object') throw new Error('Leeg antwoord');
        if (!cancelled) {
          console.debug('[BusinessStatsLive] Initial fetch data', json);
          setStats(s => {
            console.log('[BusinessStatsLive] Setting stats:', { ...s, ...json });
            return { ...s, ...json };
          });
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (e) {
        console.warn('[BusinessStatsLive] Lightweight stats fetch failed, probeer full endpoint', e);
        try {
          const res2 = await fetch(`/api/business/${businessId}`, { cache: 'no-store' });
          if (res2.ok) {
            const full = await res2.json();
            const fallback = full?.stats ? { ...full.stats } : { fallback: true };
            if (!cancelled) {
              console.debug('[BusinessStatsLive] Full endpoint fallback data', fallback);
              setStats(s => ({ ...s, ...fallback }));
              setLastUpdated(new Date());
              setError(null);
            }
          } else {
            if (!cancelled) setError('Kon statistieken niet laden');
          }
        } catch (e2) {
          if (!cancelled) setError('Kon statistieken niet laden');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, initial]);

  useEffect(() => {
    const id = setInterval(() => {
      const debugParam = typeof window !== 'undefined' && window.location.search.includes('statsDebug=1') ? '?debug=1' : '';
      fetch(`/api/business/${businessId}/stats${debugParam}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) { setStats(s => ({ ...s, ...d })); setLastUpdated(new Date()); } });
    }, 30000);
    return () => clearInterval(id);
  }, [businessId]);

  useEffect(() => {
    const channel = supabase
      .channel(`business-stats:${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dashboard_stats',
        filter: `business_id=eq.${businessId}`,
      }, (payload: { new?: RealtimeRow | null }) => {
        if (payload?.new) {
          console.debug('[BusinessStatsLive] Realtime payload', payload.new);
          setStats(s => ({ ...s, ...mapPayload(payload.new!) }));
          setLastUpdated(new Date());
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[BusinessStatsLive] Realtime SUBSCRIBED');
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [businessId, supabase]);

  const isFallback = !!stats?.fallback;
  useEffect(() => {
    if (!loading && stats && !isFallback) {
      const allZero = [stats.totalListings, stats.views, stats.bids].every(v => !v);
      if (allZero) {
        console.warn('[BusinessStatsLive] Alle statistieken zijn 0 maar niet in fallback mode – mogelijk geen data in DB of aggregaties ontbreken', stats);
      }
    }
  }, [loading, isFallback, stats]);
  
  const totalListings = typeof stats?.totalListings === 'number' ? stats.totalListings : fallbackListingsCount;
  const views = typeof stats?.views === 'number' ? stats.views : 0;
  const bids = typeof stats?.bids === 'number' ? stats.bids : 0;

  const loadingValue = <span className="inline-block w-10 h-6 bg-gray-200 animate-pulse rounded" />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative">
      <Stat label="Actieve zoekertjes" value={loading ? loadingValue : totalListings} />
      <Stat label="Bezoeken" value={loading ? loadingValue : views} />
      <Stat label="Biedingen" value={loading ? loadingValue : bids} />
      {error && !loading && (
        <div className="col-span-full text-xs text-amber-600 mt-1">{error}</div>
      )}
      {!error && !loading && !isFallback && stats?._debugListings && (
        <pre className="col-span-full mt-2 p-2 bg-gray-50 border text-[10px] max-h-40 overflow-auto">{JSON.stringify(stats._debugListings, null, 2)}</pre>
      )}
      {lastUpdated && (
        <div className="absolute -top-5 right-0 text-[10px] text-gray-400">laatst bijgewerkt {lastUpdated.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | JSX.Element }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-2xl font-semibold" aria-live="polite">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

interface RealtimeRow {
  business_id?: string;
  listings?: number;
  totalListings?: number;
  total_listings?: number;
  avg_price?: number;
  avgPrice?: number;
  views?: number;
  bids?: number;
  followers?: number;
}

function mapPayload(p: RealtimeRow) {
  return {
    totalListings: typeof p.listings === 'number' ? p.listings : (typeof p.totalListings === 'number' ? p.totalListings : (typeof p.total_listings === 'number' ? p.total_listings : undefined)),
    avgPrice: typeof p.avg_price === 'number' ? p.avg_price : (typeof p.avgPrice === 'number' ? p.avgPrice : undefined),
    views: typeof p.views === 'number' ? p.views : undefined,
    bids: typeof p.bids === 'number' ? p.bids : undefined,
    followers: typeof p.followers === 'number' ? p.followers : undefined,
  };
}
