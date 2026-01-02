import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const listingId = params.id;

  // determine viewer: logged in user or anonymous session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // parse cookie for session id
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/ocaso_session=([^;]+)/);
  let sessionId = match ? match[1] : null;
  let setCookie = false;
  if (!userId && !sessionId) {
    // create a new anonymous session id
    // crypto.randomUUID() is available in Node 18+
    // fallback to a simple random if unavailable
    try {
      const maybeCrypto = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
      sessionId = maybeCrypto.crypto && maybeCrypto.crypto.randomUUID ? maybeCrypto.crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
    } catch (e) {
      sessionId = String(Date.now()) + Math.random().toString(36).slice(2);
    }
    setCookie = true;
  }

  // check if this viewer already viewed this listing
  let existing = null;
  try {
    if (userId) {
      const { data } = await supabase
        .from("listing_views")
        .select("id")
        .eq("listing_id", listingId)
        .eq("user_id", userId)
        .limit(1);
      existing = data;
    } else {
      const { data } = await supabase
        .from("listing_views")
        .select("id")
        .eq("listing_id", listingId)
        .eq("session_id", sessionId || '')
        .limit(1);
      existing = data;
    }
  } catch (err) {
    // ignore DB errors here — fallback to safe behaviour
    existing = null;
  }

  let views = null;
  if (!existing || (Array.isArray(existing) && existing.length === 0)) {
    // insert a new view record
    try {
      await supabase.from("listing_views").insert({ listing_id: listingId, user_id: userId, session_id: userId ? null : (sessionId || null) });
    } catch (err) {
      // ignore insert errors
    }

    // increment denormalized counter on listings (atomic via DB function)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("increment_listing_views", { p_listing_id: listingId });
      if (!rpcErr) views = rpcData as unknown as number;
    } catch (err) {
      // ignore
    }
  } else {
    // return current stored views if we can
    try {
      const { data } = await supabase.from("listings").select("views").eq("id", listingId).single();
      views = data?.views ?? null;
    } catch (err) {
      views = null;
    }
  }

  const res = NextResponse.json({ success: true, views });
  if (setCookie && sessionId) {
    // set cookie for 30 days
    res.headers.set("Set-Cookie", `ocaso_session=${sessionId}; Path=/; Max-Age=${60 * 60 * 24 * 30};`);
  }
  return res;
}
