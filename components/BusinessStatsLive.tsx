import { Suspense } from "react";

import { supabaseServer } from "../lib/supabaseServer";
import BusinessStatsClient from "./BusinessStatsClient";

export interface BusinessStatsLiveProps {
  businessId: string;
}

interface ListingRow {
  id: string;
  price?: number | null;
  status?: string | null;
  views?: number | null;
}

export default async function BusinessStatsLive({ businessId }: BusinessStatsLiveProps) {
  // Server component voor initial data
  let initialStats: { totalListings?: number; views?: number; bids?: number; fallback?: boolean } | null = null;
  let error: string | null = null;

  try {
    const supabase = supabaseServer();

    // First try to get stats from the pre-calculated dashboard_stats table
    const { data: dashboardStats, error: dashboardError } = await supabase
      .from("dashboard_stats")
      .select("listings,avg_price,views,bids,followers")
      .eq("business_id", businessId)
      .maybeSingle();

    if (dashboardStats && !dashboardError) {
      // Use pre-calculated stats from dashboard_stats table
      initialStats = {
        totalListings: dashboardStats.listings || 0,
        views: dashboardStats.views || 0,
        bids: dashboardStats.bids || 0,
        fallback: false,
      };
    } else {
      // Fallback to direct calculation if dashboard_stats doesn't exist or has no data
      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("id,price,status,views")
        .eq("seller_id", businessId)
        .in("status", ["active", "published"]);

      if (listingsError) throw listingsError;

      const list = (listings as ListingRow[]) || [];

      // If no listings exist, return fallback stats
      if (list.length === 0) {
        initialStats = {
          totalListings: 0,
          views: 0,
          bids: 0,
          fallback: true,
        };
      } else {
        // Accurate bids total door aparte aggregate
        let totalBids = 0;
        try {
          if (list.length) {
            const ids = list.map((l: ListingRow) => l.id);
            const { data: bidCounts } = await supabase
              .from("bids")
              .select("listing_id")
              .in("listing_id", ids);
            if (Array.isArray(bidCounts)) totalBids = bidCounts.length;
          }
        } catch { /* ignore bid aggregation errors */ }

        initialStats = {
          totalListings: list.length,
          views: list.reduce((s: number, l: ListingRow) => s + (typeof l.views === "number" ? l.views : 0), 0),
          bids: totalBids,
          fallback: false,
        };
      }
    }
  } catch (e) {
    console.warn('[BusinessStatsLive] Server-side fetch failed:', e);
    error = 'Kon statistieken niet laden';
    initialStats = {
      totalListings: 0,
      views: 0,
      bids: 0,
      fallback: true
    };
  }

  return (
    <Suspense fallback={
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative">
        <Stat label="Actieve zoekertjes" value={<span className="inline-block w-10 h-6 bg-gray-200 animate-pulse rounded" />} />
        <Stat label="Bezoeken" value={<span className="inline-block w-10 h-6 bg-gray-200 animate-pulse rounded" />} />
        <Stat label="Biedingen" value={<span className="inline-block w-10 h-6 bg-gray-200 animate-pulse rounded" />} />
      </div>
    }>
      <BusinessStatsClient businessId={businessId} initialStats={initialStats} initialError={error} />
    </Suspense>
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
