import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Init service role client
  const admin = supabaseAdmin();

  async function count(table: string) {
    const { count, error } = await admin.from(table).select("*", {
      count: "exact",
      head: true,
    });
    return { count: count ?? 0, error: error?.message ?? null };
  }

  const [
    profiles,
    listings,
    categories,
    subcategories,
    bids,
    favorites,
    conversations,
    messages,
    orders,
    reviews,
    user_subscriptions,
  ] = await Promise.all([
    count("profiles"),
    count("listings"),
    count("categories"),
    count("subcategories"),
    count("bids"),
    count("favorites"),
    count("conversations"),
    count("messages"),
    count("orders"),
    count("reviews"),
    count("user_subscriptions"),
  ]);

  // listing_views may not exist everywhere
  let listing_views: { count: number; error: string | null } = {
    count: 0,
    error: null,
  };
  try {
    listing_views = await count("listing_views");
  } catch {
    listing_views = { count: 0, error: "table-missing" };
  }

  return NextResponse.json({
    ok: true,
    counts: {
      profiles,
      listings,
      categories,
      subcategories,
      bids,
      favorites,
      conversations,
      messages,
      orders,
      reviews,
      user_subscriptions,
      listing_views,
    },
  });
}
