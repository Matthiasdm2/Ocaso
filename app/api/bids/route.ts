import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listing_id");
  if (!listingId) {
    return NextResponse.json({ items: [], error: "Missing listing_id" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase
    .from("bids")
    .select("amount,created_at,bidder_id")
    .eq("listing_id", listingId)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
