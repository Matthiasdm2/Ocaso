import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listing_id");
  if (!listingId) {
    return NextResponse.json({ items: [], error: "Missing listing_id" }, {
      status: 400,
    });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase
    .from("bids")
    .select("amount,created_at,bidder_id")
    .eq("listing_id", listingId)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, {
      status: 500,
    });
  }

  // Get unique bidder_ids
  const bidderIds = [...new Set((data ?? []).map((bid) => bid.bidder_id))];

  // Fetch profiles for these bidder_ids
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", bidderIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  // Transform data to include bidder_name
  const transformedData = (data ?? []).map((bid) => ({
    amount: bid.amount,
    created_at: bid.created_at,
    bidder_id: bid.bidder_id,
    bidder_name: profileMap.get(bid.bidder_id) || "Onbekende gebruiker",
  }));

  return NextResponse.json({ items: transformedData });
}
