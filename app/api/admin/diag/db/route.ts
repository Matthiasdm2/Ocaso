import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";
import { withCORS } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: withCORS(req) });
}

export async function GET(_req: Request) {
  // Authenticate requester
  const auth = supabaseServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await auth.from("profiles").select("is_admin").eq(
    "id",
    user.id,
  ).single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Init service role client
  const admin = supabaseServiceRole();

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
  }, { headers: withCORS(_req) });
}
