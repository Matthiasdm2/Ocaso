export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const listingId = params.id;
  try {
    const { data: rows, error: rowsErr } = await supabase
      .from("listing_views")
      .select("id, listing_id, user_id, session_id, created_at")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id, views")
      .eq("id", listingId)
      .maybeSingle();

    return NextResponse.json({ success: true, listing: listing ?? null, rows: rows ?? [], rowsError: rowsErr ? String(rowsErr) : null, listingError: listingErr ? String(listingErr) : null });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
