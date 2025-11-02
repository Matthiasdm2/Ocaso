export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

type ListingRow = { views?: unknown; favorites_count?: unknown } | null;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ views: 0, favorites: 0 });
    }
    
    const sAnon = supabaseServer();

  // Probeer eerst met RLS (anon/cookie). Als dit faalt, val terug op service role (alleen lezen van publieke cijfers).
  let views: number | null = null;
  let favoritesFromCol: number | null = null;
  let hasFavoritesCountCol = false;
  try {
    const { data, error }:
      { data: ListingRow; error: { message: string } | null } = await sAnon
      .from("listings")
      .select("views, favorites_count")
      .eq("id", listingId)
      .single();
    if (!error && data) {
      views = typeof data.views === "number" ? data.views : Number(data.views ?? 0);
      hasFavoritesCountCol = Object.prototype.hasOwnProperty.call(data, "favorites_count");
      favoritesFromCol = hasFavoritesCountCol && typeof data.favorites_count === "number"
        ? Number(data.favorites_count)
        : hasFavoritesCountCol
          ? Number(data.favorites_count ?? 0)
          : null; // mark as unknown if column missing
    }
  } catch {
    // ignore, fallback below
  }

  if (views === null || !Number.isFinite(views)) {
    try {
      const sSrv = supabaseServiceRole();
      const { data }:
        { data: ListingRow } = await sSrv
        .from("listings")
        .select("views, favorites_count")
        .eq("id", listingId)
        .single();
      views = typeof data?.views === "number" ? data.views : Number(data?.views ?? 0);
      hasFavoritesCountCol = !!data && Object.prototype.hasOwnProperty.call(data, "favorites_count");
      favoritesFromCol = hasFavoritesCountCol && typeof data?.favorites_count === "number"
        ? Number(data?.favorites_count)
        : hasFavoritesCountCol
          ? Number((data as { favorites_count?: unknown } | null)?.favorites_count ?? 0)
          : null;
    } catch {
      views = 0;
    }
  }

  // Bepaal favorites via service-role count om RLS-filtering te vermijden.
  let favorites = 0;
  try {
    const sSrv = supabaseServiceRole();
    const { count } = await sSrv
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);
    if (typeof count === "number") favorites = count;
  } catch {
    // Fall back op kolom of anon-count
    const col = Number(favoritesFromCol ?? 0);
    if (Number.isFinite(col) && col >= 0) {
      favorites = col;
    } else {
      try {
        const { count } = await sAnon
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq("listing_id", listingId);
        if (typeof count === "number") favorites = count;
      } catch {
        favorites = 0;
      }
    }
  }

  return NextResponse.json({ views: Number(views ?? 0), favorites: Number(favorites ?? 0) });
  } catch (error) {
    // Always return a valid response, even on errors
    console.error('Error in listing stats API:', error);
    return NextResponse.json({ views: 0, favorites: 0 });
  }
}
