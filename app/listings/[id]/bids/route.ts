import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  
  // Create Supabase client with custom fetch that includes the Authorization header
  // This ensures RLS policies can access auth.uid() correctly
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        // Custom fetch to ensure Authorization header is sent with all requests
        fetch: async (url, options = {}) => {
          const headers = new Headers(options.headers);
          if (accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
          }
          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  );
  
  return supabase;
}

export async function POST(request: Request) {
  const { listingId, amount, bidderId } = await request.json();
  if (!listingId || !amount || !bidderId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  
  const authHeader = request.headers.get("Authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  
  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const supabase = getSupabaseWithAuth(request);
  
  // Verify the user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user || user.id !== bidderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Controleer of bieden is toegestaan
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("allowoffers, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
    
  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  
  if (!listing.allowoffers) {
    return NextResponse.json({ error: "Bieden niet toegestaan" }, { status: 403 });
  }
  
  if (listing.seller_id === bidderId) {
    return NextResponse.json({ error: "Je kunt niet bieden op je eigen listing" }, { status: 403 });
  }
  
  // Insert bid - RLS policy should allow this if user is authenticated
  const { data, error } = await supabase
    .from("bids")
    .insert({ listing_id: listingId, amount, bidder_id: bidderId })
    .select();
    
  if (error) {
    console.error("Bid insert error:", error);
    return NextResponse.json({ error: error.message || "Failed to place bid" }, { status: 500 });
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
