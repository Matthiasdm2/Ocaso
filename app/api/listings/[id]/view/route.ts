export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

// helper removed to avoid unused warnings; errors will be stringified inline if needed

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const listingId = params.id;
  // parse URL if needed in future

  // determine viewer: logged in user or anonymous session
  let user = null;
  try {
    const userResp = await supabase.auth.getUser();
    user = userResp?.data?.user ?? null;
  } catch (authError) {
    console.warn("[listings/view] Auth error:", authError);
  }
  const userId = user?.id ?? null;

  // parse cookie for session id

  // parse cookie for session id
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/ocaso_session=([^;]+)/);
  let sessionId = match ? match[1] : null;
  let setCookie = false;
  if (!userId && !sessionId) {
    try {
      const maybeCrypto = globalThis as unknown as {
        crypto?: { randomUUID?: () => string };
      };
      sessionId = maybeCrypto.crypto && maybeCrypto.crypto.randomUUID
        ? maybeCrypto.crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2);
    } catch (e) {
      sessionId = String(Date.now()) + Math.random().toString(36).slice(2);
    }
    setCookie = true;
  }

  // check if this viewer already viewed this listing
  let existing: unknown = null;
  // always check existing viewer
  {
    try {
      if (userId) {
        const resp = await supabase.from("listing_views").select("id").eq(
          "listing_id",
          listingId,
        ).eq("user_id", userId).limit(1);
        existing = resp.data ?? null;
      } else {
        const resp = await supabase.from("listing_views").select("id").eq(
          "listing_id",
          listingId,
        ).eq("session_id", sessionId || '').limit(1);
        existing = resp.data ?? null;
      }
      // existing presence determined below
    } catch (err) {
      existing = null;
    }
  }

  let views: number | null = null;
  let inserted = false;

  if (!existing || (Array.isArray(existing) && existing.length === 0)) {
    try {
      const insertRes = await supabase.from("listing_views").insert({
        listing_id: listingId,
        user_id: userId,
        session_id: userId ? null : sessionId,
      }).select("id");
      if (
        insertRes && insertRes.data && Array.isArray(insertRes.data) &&
        insertRes.data.length > 0
      ) inserted = true;
    } catch (err) {
      inserted = false;
    }

    if (inserted) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          "increment_listing_views",
          { p_listing_id: listingId },
        );
        if (rpcErr) {
          // ignore rpc error and fall back
        }
        if (rpcData) {
          if (typeof rpcData === "number") views = Number(rpcData);
          else if (Array.isArray(rpcData) && rpcData.length) {
            const first = rpcData[0];
            if (typeof first === "number") views = first;
            else views = Number(Object.values(first)[0]) || null;
          } else if (rpcData && typeof rpcData === "object") {
            const val = Object.values(rpcData)[0];
            views = typeof val === "number" ? val : Number(val) || null;
          }
        }
      } catch (err) {
        // ignore and fall back
      }

      // fallback: if RPC did not yield a numeric views, try reading listings.views and as last resort increment it
      if (views === null || views === undefined) {
        try {
          const { data: listing } = await supabase.from("listings").select(
            "views",
          ).eq("id", listingId).single();
          views = Number(listing?.views ?? 0);
        } catch (e) {
          // last resort: read then update
          try {
            const { data: cur } = await supabase.from("listings").select(
              "views",
            ).eq("id", listingId).single();
            const curViews = Number(cur?.views ?? 0);
            const newVal = curViews + 1;
            const { error: updErr } = await supabase.from("listings").update({
              views: newVal,
            }).eq("id", listingId);
            if (!updErr) views = newVal;
          } catch (ee) {
            // give up, will default below
          }
        }
      }
    } else {
      try {
        const { data: listing } = await supabase.from("listings").select(
          "views",
        ).eq("id", listingId).single();
        views = listing?.views ?? null;
      } catch (err) {
        views = null;
      }
    }
  } else {
    try {
      const { data: listing } = await supabase.from("listings").select("views")
        .eq("id", listingId).single();
      views = listing?.views ?? null;
    } catch (err) {
      views = null;
    }
  }

  if (views === null) {
    try {
      const { data: listing } = await supabase.from("listings").select("views")
        .eq("id", listingId).single();
      views = Number(listing?.views ?? 0);
    } catch (err) {
      views = 0;
    }
  } else {
    views = Number(views);
  }

  const res = NextResponse.json({ success: true, views });
  if (setCookie && sessionId) {
    res.headers.set(
      "Set-Cookie",
      `ocaso_session=${sessionId}; Path=/; Max-Age=${60 * 60 * 24 * 30};`,
    );
  }
  return res;

  const response = NextResponse.json({ success: true, views });
  if (setCookie && sessionId) {
    response.headers.set(
      "Set-Cookie",
      `ocaso_session=${sessionId}; Path=/; Max-Age=${60 * 60 * 24 * 30};`,
    );
  }
  return response;
}
