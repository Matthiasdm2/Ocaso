import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseWithAuth(request: Request) {
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : undefined
  );
}

export async function POST(request: Request) {
  const { listingId, amount, bidderId } = await request.json();
  if (!listingId || !amount || !bidderId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  const supabase = getSupabaseWithAuth(request);
  // Controleer of bieden is toegestaan
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("allowOffers")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError || !listing || !listing.allowOffers) {
    return NextResponse.json({ error: "Bieden niet toegestaan" }, { status: 403 });
  }
  const { data, error } = await supabase.from("bids").insert({ listing_id: listingId, amount, bidder_id: bidderId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, bid: data?.[0] });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }
  const supabase = getSupabaseWithAuth(request);
  const { data, error } = await supabase
    .from("bids")
    .select("amount")
    .eq("listing_id", listingId)
    .order("amount", { ascending: false })
    .limit(1);
  const { count } = await supabase
    .from("bids")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ highest: data?.[0]?.amount ?? null, count: count ?? 0 });
}
