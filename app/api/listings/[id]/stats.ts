import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const listingId = params.id;
  // Haal views op
  const { data: listing } = await supabase
    .from("listings")
    .select("views")
    .eq("id", listingId)
    .single();
  // Haal aantal favorieten op
  const { count: favorites } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId);
  return NextResponse.json({ views: listing?.views ?? 0, favorites: favorites ?? 0 });
}
