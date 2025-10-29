export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let supabase = supabaseServer();
  const listingId = params.id;
  let user = null;
  try {
    const { data: { user: u } } = await supabase.auth.getUser();
    user = u;
  } catch (authError) {
    console.warn("[listings/favorite] Auth error:", authError);
  }
  if (!user) {
    const auth = req.headers.get("authorization");
    const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const alt = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      try {
        const got = await alt.auth.getUser();
        if (got.data.user) { user = got.data.user; supabase = alt as unknown as typeof supabase; }
      } catch (bearerError) {
        console.warn("[listings/favorite] Bearer auth error:", bearerError);
      }
    }
  }
  if (!user) return NextResponse.json({ success: false, error: "Niet ingelogd" }, { status: 401 });

  // Use elevated client for DB write to avoid RLS edge-cases; identity already verified above
  const svc = supabaseServiceRole();
  const { error } = await svc
    .from("favorites")
    .upsert({ listing_id: listingId, user_id: user.id });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
