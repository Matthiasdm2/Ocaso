import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const listingId = params.id;

  // Read views from listings (may be subject to RLS)
  const { data: listing } = await supabase
    .from("listings")
    .select("views")
    .eq("id", listingId)
    .single();

  // Count favorites (use count head=true)
  const { count: favorites } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId);

  return NextResponse.json({ views: listing?.views ?? 0, favorites: favorites ?? 0 });
}
