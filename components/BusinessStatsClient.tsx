"use client";
import { useEffect, useState } from "react";

interface BusinessStatsClientProps {
  businessId: string;
  initialStats: { totalListings?: number; views?: number; bids?: number; fallback?: boolean } | null;
  initialError: string | null;
}

export default function BusinessStatsClient({ businessId, initialStats, initialError }: BusinessStatsClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState(initialError);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial timestamp
    setLastUpdated(new Date());

    // Polling every 2 minutes for live updates
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/business/${businessId}/stats`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (e) {
        console.warn('[BusinessStatsClient] Polling failed:', e);
        // Keep existing data on polling errors
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [businessId]);

  const totalListings = stats?.totalListings ?? 0;
  const views = stats?.views ?? 0;
  const bids = stats?.bids ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative">
      <Stat label="Actieve zoekertjes" value={totalListings} />
      <Stat label="Bezoeken" value={views} />
      <Stat label="Biedingen" value={bids} />
      {error && (
        <div className="col-span-full text-sm text-amber-600 mt-1">{error}</div>
      )}
      {lastUpdated && (
        <div className="absolute -top-5 right-0 text-[10px] text-gray-400">
          laatst bijgewerkt {lastUpdated.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
        </div>
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
