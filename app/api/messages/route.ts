import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

// Ensure this route never attempts static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supabaseFromBearer(token?: string | null) {
  if (!token) return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}

// GET list conversations for current user with last message
export async function GET(request: Request) {
  let supabase = supabaseServer();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const auth = request.headers.get("authorization");
    const token = auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7)
      : null;
    const alt = supabaseFromBearer(token);
    if (alt) {
      const got = await alt.auth.getUser();
      if (got.data.user) {
        user = got.data.user;
        supabase = alt;
      }
    }
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase.rpc("conversation_overview");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  interface ConversationOverviewRow {
    id: string;
    participants: string[];
    updated_at: string;
    last_message_id: string | null;
    last_message_body: string | null;
    last_message_created_at: string | null;
    last_message_sender: string | null;
    unread_count: number | null;
    listing_id?: string | null;
  }
  const rows: ConversationOverviewRow[] = Array.isArray(data) ? data : [];
  // Fetch listing snippets for all listing-linked conversations to enrich UI (single roundtrip)
  const listingIds = Array.from(
    new Set(
      rows.map((r) => r.listing_id).filter((v): v is string =>
        typeof v === "string"
      ),
    ),
  );
  const listingsMap: Record<
    string,
    { id: string; title: string; image: string | null }
  > = {};
  if (listingIds.length) {
    type ListingRow = {
      id: string;
      title: string;
      main_photo: string | null;
      images: string[] | null;
    };
    const { data: listingRows } = await supabase
      .from("listings")
      .select("id,title,main_photo,images")
      .in("id", listingIds) as { data: ListingRow[] | null };
    (listingRows || []).forEach((l) => {
      const imgs = Array.isArray(l.images) ? l.images : [];
      const image = l.main_photo || (imgs.length ? imgs[0] : null);
      listingsMap[l.id] = { id: l.id, title: l.title, image };
    });
  }
  const results = rows.map((r) => {
    const last = r.last_message_id
      ? {
        id: r.last_message_id!,
        body: r.last_message_body,
        created_at: r.last_message_created_at!,
        sender_id: r.last_message_sender!,
      }
      : null;
    const listingInfo = r.listing_id ? listingsMap[r.listing_id] || null : null;
    return {
      id: r.id,
      participants: r.participants,
      updated_at: r.updated_at,
      lastMessage: last,
      unread: r.unread_count || 0,
      listing: listingInfo,
      listing_id: r.listing_id || null,
    };
  });
  return NextResponse.json({ conversations: results });
}

// POST start conversation: body { otherUserId: string, listingId: string }
export async function POST(request: Request) {
  let supabase = supabaseServer();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const auth = request.headers.get("authorization");
    const token = auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7)
      : null;
    const alt = supabaseFromBearer(token);
    if (alt) {
      const got = await alt.auth.getUser();
      if (got.data.user) {
        user = got.data.user;
        supabase = alt;
      }
    }
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const otherUserId = String(body.otherUserId || "").trim();
  const listingId = body.listingId ? String(body.listingId) : null;
  if (!otherUserId) {
    return NextResponse.json({ error: "missing_otherUserId" }, { status: 400 });
  }
  if (otherUserId === user.id) {
    return NextResponse.json({ error: "self" }, { status: 400 });
  }
  if (!listingId) {
    return NextResponse.json({ error: "listing_required" }, { status: 400 });
  }

  // Validate listing exists (prevents orphan chats) – soft check (RLS must allow select)
  try {
    const { data: listingRow, error: listingErr } = await supabase
      .from("listings")
      .select("id")
      .eq("id", listingId)
      .maybeSingle();
    if (listingErr) {
      // If RLS blocks select we still continue (service role insert will succeed) – just log in dev.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[messages POST] listing select error",
          listingErr.message,
        );
      }
    } else if (!listingRow) {
      return NextResponse.json({ error: "invalid_listing" }, { status: 400 });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[messages POST] listing validation exception", e);
    }
  }

  // Normalize participants order (stable sorting) so we can lookup existing.
  // NOTE: PostgREST array equality via eq on uuid[] is flaky; we fallback to contains + manual length/equality filter.
  const participants = [user.id, otherUserId].sort();
  let existingQuery = supabase
    .from("conversations")
    .select("id, participants, listing_id, created_at")
    .contains("participants", participants)
    .order("created_at", { ascending: true })
    .limit(5);
  existingQuery = existingQuery.eq("listing_id", listingId);
  const { data: existingCandidates } = await existingQuery;
  interface ConversationRow {
    id: string;
    participants: string[];
    listing_id?: string | null;
    created_at?: string;
  }
  const existing =
    (existingCandidates as ConversationRow[] | null | undefined || []).find((
      c: ConversationRow,
    ) =>
      Array.isArray(c.participants) && c.participants.length === 2 &&
      c.participants[0] === participants[0] &&
      c.participants[1] === participants[1]
    );
  if (existing) {
    return NextResponse.json({ conversation: existing, created: false });
  }
  try {
    // Graceful guard: if service role key is missing in env, return a clear 503 instead of throwing
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "service_role_missing" }, {
        status: 503,
      });
    }
    const elevated = supabaseServiceRole();
    // With unique index in place this will error if duplicate creation races; we then refetch.
    const { data: conv, error } = await elevated
      .from("conversations")
      .insert({ participants, listing_id: listingId })
      .select("id, participants, listing_id, created_at")
      .single();
    if (error && /duplicate key value/.test(error.message)) {
      // Re-query using contains approach
      let retry = supabase
        .from("conversations")
        .select("id, participants, listing_id, created_at")
        .contains("participants", participants)
        .order("created_at", { ascending: true })
        .limit(5);
      retry = retry.eq("listing_id", listingId);
      const { data: retryList } = await retry;
      const again = (retryList as ConversationRow[] | null | undefined || [])
        .find((c: ConversationRow) =>
          Array.isArray(c.participants) && c.participants.length === 2 &&
          c.participants[0] === participants[0] &&
          c.participants[1] === participants[1]
        );
      if (again) {
        return NextResponse.json({ conversation: again, created: false });
      }
      return NextResponse.json({ error: "conflict_retry_failed" }, {
        status: 409,
      });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ conversation: conv, created: true });
  } catch (e: unknown) {
    const errorMessage = typeof e === "object" && e !== null && "message" in e
      ? (e as { message?: string }).message
      : undefined;
    return NextResponse.json({ error: errorMessage || "insert_failed" }, {
      status: 500,
    });
  }
}
