"use client";
import { useEffect, useState } from "react";

interface BusinessStatsClientProps {
  businessId?: string;
  initialStats: { totalListings?: number; views?: number; bids?: number; fallback?: boolean } | null;
  initialError: string | null;
}

export default function BusinessStatsClient({ businessId, initialStats, initialError }: BusinessStatsClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState(initialError);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const totalListings = stats?.totalListings ?? 0;
  const views = stats?.views ?? 0;
  const bids = stats?.bids ?? 0;

  // Fetch live stats every 30 seconds
  useEffect(() => {
    if (!businessId) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/business/${businessId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalListings: data.totalListings || 0,
            views: data.views || 0,
            bids: data.bids || 0,
            fallback: data.fallback || false,
          });
          setError(null);
          setLastUpdated(new Date());
        } else {
          console.warn('Failed to fetch business stats:', response.status);
        }
      } catch (err) {
        console.warn('Error fetching business stats:', err);
      }
    };

    // Initial fetch after 5 seconds
    const initialTimeout = setTimeout(fetchStats, 5000);

    // Then fetch every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [businessId]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative">
      <Stat label="Actieve zoekertjes" value={totalListings} />
      <Stat label="Bezoeken" value={views} />
      <Stat label="Biedingen" value={bids} />
      {error && (
        <div className="col-span-full text-sm text-amber-600 mt-1">{error}</div>
      )}
      <div className="absolute -top-5 right-0 text-[10px] text-green-600 font-medium">
        live • {lastUpdated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
      </div>
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
