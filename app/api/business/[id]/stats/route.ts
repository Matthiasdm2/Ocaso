import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Lightweight endpoint dat alleen aggregaties teruggeeft voor een business.
 * Kan gebruikt worden door de client voor refresh zonder volledige payload.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { id } = params;
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';
  try {
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id,price,status,views,bids(count)")
      .eq("seller_id", id);
    if (error) throw error;
  interface Row { id: string; price?: number | null; status?: string | null; views?: number | null; bids?: { count: number }[] | null }
    const list = (listings as Row[]) || [];
    // Accurate bids total door aparte aggregate (kan sneller zijn bij veel rows, maar simpel hier)
    let totalBids = 0;
    try {
      if (list.length) {
        const ids = list.map(l => l.id);
        const { data: bidCounts } = await supabase
          .from('bids')
          .select('listing_id')
          .in('listing_id', ids);
        if (Array.isArray(bidCounts)) totalBids = bidCounts.length;
      }
  } catch { /* ignore bid aggregation errors */ }
    const stats = {
      totalListings: list.length,
      sold: list.filter(l => l.status === 'sold').length,
      avgPrice: list.length ? Math.round(list.reduce((s,l) => s + (l.price ?? 0),0) / list.length) : 0,
      views: list.reduce((s,l) => s + (typeof l.views === 'number' ? l.views : 0),0),
      bids: totalBids,
      fallback: false,
      ...(debug ? { _debugListings: list.map(l => ({ id: l.id, status: l.status, views: l.views })) } : {}),
    };
    if (debug) {
      console.debug('[api business stats] debug payload', stats);
    }
    return NextResponse.json(stats);
  } catch (e) {
    console.warn('[api business stats] fallback zeros door fout', e);
    return NextResponse.json({ totalListings: 0, sold: 0, avgPrice: 0, views: 0, bids: 0, fallback: true }, { status: 200 });
  }
}
