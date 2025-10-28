import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

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
  console.log("[MESSAGES API] Starting GET request");
  let supabase = supabaseServer();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("[MESSAGES API] No user found, trying bearer token");
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
        console.log("[MESSAGES API] User found via bearer token:", user.id);
      }
    }
  }

  if (!user) {
    console.log("[MESSAGES API] No authenticated user found");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  console.log("[MESSAGES API] Processing for user:", user.id);

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

  let rows: ConversationOverviewRow[] | null = null;

  // Prefer the database RPC that already handles unread counts & last message lookup
  try {
    const { data: rpcRows, error: rpcError } = await supabase
      .rpc("conversation_overview");
    if (rpcError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[MESSAGES API] conversation_overview RPC failed", rpcError.message);
      }
    } else if (Array.isArray(rpcRows)) {
      rows = (rpcRows as ConversationOverviewRow[]).map((r) => ({
        id: r.id,
        participants: Array.isArray(r.participants) ? r.participants : [],
        updated_at: r.updated_at,
        last_message_id: r.last_message_id || null,
        last_message_body: r.last_message_body || null,
        last_message_created_at: r.last_message_created_at || null,
        last_message_sender: r.last_message_sender || null,
        unread_count: r.unread_count ?? 0,
        listing_id: r.listing_id ?? null,
      }));
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[MESSAGES API] conversation_overview RPC exception", e);
    }
  }

  if (!rows) {
    // Fallback to manual query for environments where the RPC is unavailable
    console.log("[MESSAGES API] Falling back to manual conversations query");
    const { data: conversationsData, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        participants,
        updated_at,
        listing_id,
        messages (
          id,
          body,
          created_at,
          sender_id
        )
      `)
      .contains("participants", [user.id])
      .order("updated_at", { ascending: false })
      .limit(50)
      // Ensure newest message is first so array index 0 is latest when present
      .order("created_at", { foreignTable: "messages", ascending: false })
      // Only fetch the single most recent message per conversation (avoids large payloads)
      .limit(1, { foreignTable: "messages" });

    if (convError) {
      console.error("[MESSAGES API] Database error:", convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    interface RawConversation {
      id: string;
      participants: string[];
      updated_at: string;
      listing_id: string | null;
      messages: Array<{
        id: string;
        body: string;
        created_at: string;
        sender_id: string;
      }>;
    }

    rows = ((conversationsData as RawConversation[] | null) || []).map((conv) => {
      const messages = Array.isArray(conv.messages) ? conv.messages : [];
      const lastMessage = messages[0];
      return {
        id: conv.id,
        participants: Array.isArray(conv.participants) ? conv.participants : [],
        updated_at: conv.updated_at,
        last_message_id: lastMessage?.id || null,
        last_message_body: lastMessage?.body || null,
        last_message_created_at: lastMessage?.created_at || null,
        last_message_sender: lastMessage?.sender_id || null,
        unread_count: 0,
        listing_id: conv.listing_id,
      };
    });
  }

  rows = rows || [];
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
    // Use regular authenticated client instead of service role
    // RLS policies will ensure users can only create conversations they're participants in
    const { data: conv, error } = await supabase
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
