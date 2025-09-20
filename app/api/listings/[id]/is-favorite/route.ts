import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  let supabase = supabaseServer();
  const listingId = params.id;
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const auth = req.headers.get("authorization");
    const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const alt = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const got = await alt.auth.getUser();
      if (got.data.user) { user = got.data.user; supabase = alt as unknown as typeof supabase; }
    }
  }
  if (!user) return NextResponse.json({ isFavorite: false });

  const { data } = await supabase
    .from("favorites")
    .select("user_id")
    .eq("listing_id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ isFavorite: !!data });
}
