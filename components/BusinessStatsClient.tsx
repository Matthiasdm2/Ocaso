"use client";
import { useState } from "react";

interface BusinessStatsClientProps {
  businessId?: string;
  initialStats: { totalListings?: number; views?: number; bids?: number; fallback?: boolean } | null;
  initialError: string | null;
}

export default function BusinessStatsClient({ initialStats, initialError }: BusinessStatsClientProps) {
  const [stats] = useState(initialStats);
  const [error] = useState(initialError);

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
      <div className="absolute -top-5 right-0 text-[10px] text-gray-400">
        server data
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
