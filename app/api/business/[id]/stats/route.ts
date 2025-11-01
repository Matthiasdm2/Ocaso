export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Lightweight endpoint dat alleen aggregaties teruggeeft voor een business.
 * Kan gebruikt worden door de client voor refresh zonder volledige payload.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { id } = params;
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  try {
    // First try to get stats from the pre-calculated dashboard_stats table
    const { data: dashboardStats, error: dashboardError } = await supabase
      .from("dashboard_stats")
      .select("listings,avg_price,views,bids,followers")
      .eq("business_id", id)
      .maybeSingle();

    if (dashboardStats && !dashboardError) {
      // Use pre-calculated stats from dashboard_stats table
      const stats = {
        totalListings: dashboardStats.listings || 0,
        avgPrice: dashboardStats.avg_price || 0,
        views: dashboardStats.views || 0,
        bids: dashboardStats.bids || 0,
        followers: dashboardStats.followers || 0,
        fallback: false,
        ...(debug ? { _debugSource: "dashboard_stats" } : {}),
      };
      if (debug) {
        console.debug("[api business stats] dashboard_stats payload", stats);
      }
      return NextResponse.json(stats);
    }

    // Fallback to direct calculation if dashboard_stats doesn't exist or has no data
    console.warn("[api business stats] dashboard_stats not found, falling back to direct calculation");
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id,price,status,views")
      .eq("seller_id", id)
      .in("status", ["active", "published"]);
    if (error) throw error;
    interface Row {
      id: string;
      price?: number | null;
      status?: string | null;
      views?: number | null;
    }
    const list = (listings as Row[]) || [];
    
    // If no listings exist, return fallback stats
    if (list.length === 0) {
      return NextResponse.json({
        totalListings: 0,
        avgPrice: 0,
        views: 0,
        bids: 0,
        followers: 0,
        fallback: true,
        ...(debug ? { _debugSource: "no_listings" } : {}),
      });
    }
    
    // Accurate bids total door aparte aggregate
    let totalBids = 0;
    try {
      if (list.length) {
        const ids = list.map((l) => l.id);
        const { data: bidCounts } = await supabase
          .from("bids")
          .select("listing_id")
          .in("listing_id", ids);
        if (Array.isArray(bidCounts)) totalBids = bidCounts.length;
      }
    } catch { /* ignore bid aggregation errors */ }
    const stats = {
      totalListings: list.length,
      avgPrice: list.length
        ? Math.round(list.reduce((s, l) => s + (l.price ?? 0), 0) / list.length)
        : 0,
      views: list.reduce(
        (s, l) => s + (typeof l.views === "number" ? l.views : 0),
        0,
      ),
      bids: totalBids,
      followers: 0, // followers not available in fallback
      fallback: false,
      ...(debug
        ? {
          _debugListings: list.map((l) => ({
            id: l.id,
            status: l.status,
            views: l.views,
          })),
          _debugSource: "direct_calculation",
        }
        : {}),
    };
    if (debug) {
      console.debug("[api business stats] direct calculation payload", stats);
    }
    return NextResponse.json(stats);
  } catch (e) {
    console.warn("[api business stats] fallback zeros door fout", e);
    return NextResponse.json({
      totalListings: 0,
      avgPrice: 0,
      views: 0,
      bids: 0,
      followers: 0,
      fallback: true,
    }, { status: 200 });
  }
}
