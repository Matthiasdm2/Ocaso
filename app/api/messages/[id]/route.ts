import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

// Ensure this route is always executed on Node.js runtime and not statically optimized
// Force redeploy 2

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

// GET messages with cursor pagination (?before=ISO) returns newest->oldest reversed
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
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

    const url = new URL(request.url);
    const before = url.searchParams.get("before");
    const debug = url.searchParams.has("debug");

    if (debug) {
      console.log(`[messages/:id DEBUG] request url=${request.url}`);
      console.log(`[messages/:id DEBUG] auth header present=${request.headers.get("authorization") ? 'yes' : 'no'}`);
      console.log(`[messages/:id DEBUG] user id resolved=${user?.id ?? 'null'}`);
    }

    // Verify access by selecting conversation first (will RLS filter)
    console.log(
      `[messages/:id] Checking conversation access for ${params.id}, user: ${user?.id}`,
    );
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, participants, listing_id")
      .eq("id", params.id)
      .maybeSingle();
    console.log(`[messages/:id] Conversation query result:`, {
      conv: !!conv,
      error: convError,
      participants: conv?.participants,
    });
    if (!conv) {
      console.log(
        `[messages/:id] Access denied or conversation not found for ${params.id}`,
      );
      if (process.env.NODE_ENV !== "production") {
        console.debug(
          "[messages/:id GET] conversation not found or no access",
          params.id,
        );
      }
      const debugResponse = debug ? {
        error: "not_found",
        debug: {
          user_id: user?.id,
          conversation_id: params.id,
          conv_found: false,
          conv_error: convError,
          participants_in_db: null,
        },
      } : { error: "not_found" };
      return NextResponse.json(debugResponse, { status: 404 });
    }

  // Primary query including optional columns; fallback if migration not applied yet.
  let query = supabase
    .from("messages")
    .select("id, sender_id, body, created_at, edited_at, deleted_at")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (before) query = query.lt("created_at", before);
  let { data: messages, error } = await query;
  if (error && /column .* does not exist/i.test(error.message)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[messages/:id GET] fallback to legacy columns");
    }
    let legacy = supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (before) legacy = legacy.lt("created_at", before);
    const legacyRes = await legacy;
    interface LegacyMsg {
      id: string;
      sender_id: string;
      body: string;
      created_at: string;
    }
    messages = (legacyRes.data as LegacyMsg[] | null | undefined)?.map((
      m: LegacyMsg,
    ) => ({ ...m, edited_at: null, deleted_at: null })) as typeof messages;
    error = legacyRes.error;
  }
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[messages/:id GET] query error", error.message);
    }
    return NextResponse.json({
      error: error.message,
      hint:
        "Check that chat migrations are applied (edited_at/deleted_at columns)",
    }, { status: 400 });
  }
  interface MsgRow {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
    edited_at?: string | null;
    deleted_at?: string | null;
  }
  const ordered = ((messages as MsgRow[] | null | undefined) || []).reverse();
  const hasMore = (messages || []).length === 50;

  // Batch load attachments (support both legacy url/content_type and new storage_path/mime_type/size_bytes)
  type AttachmentOut = {
    id: string;
    url?: string | null;
    content_type?: string | null;
    storage_path?: string;
    mime_type?: string | null;
    size_bytes?: number | null;
  };
  const attachmentsMap: Record<string, AttachmentOut[]> = {};
  try {
    const ids = ordered.map((m: MsgRow) => m.id);
    if (ids.length) {
      interface NewAttRow {
        id: string;
        message_id: string;
        storage_path: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        url?: string | null;
        content_type?: string | null;
      }
      interface OldAttRow {
        id: string;
        message_id: string;
        url: string;
        content_type?: string | null;
      }
      // Try selecting new + legacy columns together
      const { data: attsNew, error: attErrNew } = await supabase
        .from("message_attachments")
        .select(
          "id,message_id,storage_path,mime_type,size_bytes,url,content_type",
        )
        .in("message_id", ids);
      if (attErrNew && /column .*storage_path/i.test(attErrNew.message)) {
        // Fallback to legacy-only
        const { data: attsOld } = await supabase
          .from("message_attachments")
          .select("id,message_id,url,content_type")
          .in("message_id", ids);
        (attsOld as OldAttRow[] | null | undefined || []).forEach((a) => {
          if (!attachmentsMap[a.message_id]) attachmentsMap[a.message_id] = [];
          attachmentsMap[a.message_id].push({
            id: a.id,
            url: a.url,
            content_type: a.content_type || null,
          });
        });
      } else {
        (attsNew as NewAttRow[] | null | undefined || []).forEach((a) => {
          if (!attachmentsMap[a.message_id]) attachmentsMap[a.message_id] = [];
          attachmentsMap[a.message_id].push({
            id: a.id,
            url: a.url || null,
            content_type: a.content_type || a.mime_type || null,
            storage_path: a.storage_path,
            mime_type: a.mime_type || null,
            size_bytes: a.size_bytes ?? null,
          });
        });
      }
    }
  } catch { /* ignore */ }

  // Peer last read timestamp
  let peer_last_read_at: string | null = null;
  try {
    const parts = (conv as { participants?: string[] }).participants || [];
    const other = parts.find((p) => p !== user.id);
    if (other) {
      const { data: readRow } = await supabase
        .from("conversation_reads")
        .select("last_read_at")
        .eq("conversation_id", params.id)
        .eq("user_id", other)
        .maybeSingle();
      if (readRow?.last_read_at) {
        peer_last_read_at = readRow.last_read_at as string;
      }
    }
  } catch { /* ignore */ }

  // Optional listing details (title + main photo) for chat header display
  let listingSummary:
    | { id: string; title: string; image: string | null }
    | null = null;
  const listingId = (conv as { listing_id?: string | null })?.listing_id ||
    null;
  if (listingId) {
    try {
      const { data: listing, error: lerr } = await supabase
        .from("listings")
        .select("id,title,main_photo,images")
        .eq("id", listingId)
        .maybeSingle();
      if (!lerr && listing) {
        const images = Array.isArray((listing as { images?: unknown }).images)
          ? (listing as { images?: string[] }).images
          : [];
        const image = (listing as { main_photo?: string | null }).main_photo ||
          (images && images.length ? images[0] : null);
        listingSummary = { id: listing.id, title: listing.title, image };
      }
    } catch {
      // ignore listing fetch errors
    }
  }
  const messagesWithMeta = ordered.map((m: MsgRow) => ({
    ...m,
    attachments: attachmentsMap[m.id] || [],
    read: m.sender_id === user.id && peer_last_read_at
      ? (new Date(peer_last_read_at) >= new Date(m.created_at))
      : false,
  }));

  // Optional debug: include any readable conversation_reads rows (helps diagnose RLS issues)
  let debug_reads: unknown = undefined;
  if (debug) {
    try {
      const { data: rows } = await supabase
        .from("conversation_reads")
        .select("conversation_id,user_id,last_read_at")
        .eq("conversation_id", params.id);
      debug_reads = rows || [];
    } catch (e) {
      debug_reads = { error: (e as Error)?.message };
    }
  }
  return NextResponse.json({
    messages: messagesWithMeta,
    hasMore,
    listing_id: listingId,
    listing: listingSummary,
    peer_last_read_at,
    debug_reads,
  });
  } catch (e) {
    console.error("[messages/:id GET] internal error", e);
    return NextResponse.json({ error: "internal_error", details: (e as Error)?.message }, { status: 500 });
  }
}

// POST new message
// Force redeploy
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
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

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, participants, listing_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!conv) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        "[messages/:id POST] conversation not found or no access",
        params.id,
      );
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (
    !Array.isArray(conv.participants) || !conv.participants.includes(user.id)
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[messages/:id POST] user not participant", {
        conv,
        user: user.id,
      });
    }
    return NextResponse.json({ error: "not_participant" }, { status: 403 });
  }

  const bodyJson = await request.json();
  const text = String(bodyJson.text || "").trim().slice(0, 2000);
  interface IncomingAttachment {
    url?: string;
    content_type?: string | null;
    name?: string;
    storage_path?: string;
    mime_type?: string | null;
    size_bytes?: number | null;
  }
  const attachments: IncomingAttachment[] = Array.isArray(bodyJson.attachments)
    ? (bodyJson.attachments as unknown[])
      .filter((a): a is IncomingAttachment => {
        if (typeof a !== "object" || a === null) return false;
        const o = a as Record<string, unknown>;
        const hasStorage = typeof o.storage_path === "string" &&
          !!(o.storage_path as string);
        const hasUrl = typeof o.url === "string" && !!(o.url as string);
        return hasStorage || hasUrl;
      })
      .slice(0, 5)
    : [];
  if (!text && attachments.length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  // Rate limit simple: max 30 messages / 5 min
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .gt("created_at", since);
  if ((recentCount || 0) > 30) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Choose default body if only attachments provided
  const hasImageAttachment = attachments.some((a) => {
    const ct = (a.mime_type || a.content_type || "").toLowerCase();
    return typeof ct === "string" && ct.startsWith("image/");
  });
  const hasEpcQr = attachments.some((a) => {
    const name = (a.name || "").toLowerCase();
    return name.includes("epc") &&
      (a.mime_type || a.content_type || "").toLowerCase().startsWith("image/");
  });
  const defaultBody = attachments.length
    ? (hasImageAttachment && !hasEpcQr
      ? "scan en betaal"
      : hasEpcQr
      ? ""
      : "[bijlage]")
    : "";
  console.log("Message creation:", {
    hasImageAttachment,
    hasEpcQr,
    defaultBody,
    attachmentNames: attachments.map((a) => a.name),
  });

  // Backward compatibility: legacy messages schema may still have NOT NULL listing_id / recipient_id columns.
  // Strategy:
  // 1. Attempt insert including listing_id when we have it (prevents NOT NULL failure).
  // 2. If we get recipient_id NOT NULL, derive other participant and retry.
  let insertError: unknown = null;
  // Use loose typing here to avoid build-time inference issues when Supabase types aren't generated
  type InsertedMessage = {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
    edited_at?: string | null;
    deleted_at?: string | null;
  };
  let inserted: unknown = null; // will narrow after successful insert
  const listingId = (conv as { listing_id?: string | null })?.listing_id ||
    null;
  const basePayload: Record<string, unknown> = {
    conversation_id: params.id,
    sender_id: user.id,
    body: text || defaultBody,
  };
  if (listingId) basePayload.listing_id = listingId;
  {
    const { data, error } = await supabase
      .from("messages")
      .insert(basePayload)
      .select("id, sender_id, body, created_at, edited_at, deleted_at")
      .single();
    insertError = error as unknown;
    inserted = (data as typeof inserted) || null;
  }
  // Retry if recipient_id constraint appears
  const needsRecipient = (err: unknown) =>
    typeof err === "object" && err !== null && "message" in err &&
    /null value in column "recipient_id"/i.test(
      String((err as { message?: string }).message),
    );
  if (!inserted && needsRecipient(insertError)) {
    const parts = (conv as { participants?: string[] }).participants;
    const other = Array.isArray(parts)
      ? (parts.find((p) => p !== user.id) || null)
      : null;
    if (other) {
      const retryPayload = { ...basePayload, recipient_id: other };
      const { data: data2, error: error2 } = await supabase
        .from("messages")
        .insert(retryPayload)
        .select("id, sender_id, body, created_at, edited_at, deleted_at")
        .single();
      insertError = error2 as unknown;
      inserted = (data2 as typeof inserted) || null;
    }
  }
  // As a final fallback: if initial attempt omitted listing_id (because conv missing listing_id due to select omission) and error shows listing_id NOT NULL.
  const needsListing = (err: unknown) =>
    typeof err === "object" && err !== null && "message" in err &&
    /null value in column "listing_id"/i.test(
      String((err as { message?: string }).message),
    );
  if (
    !inserted && needsListing(insertError) && listingId &&
    !("listing_id" in basePayload)
  ) {
    const retry2 = await supabase
      .from("messages")
      .insert({ ...basePayload, listing_id: listingId })
      .select("id, sender_id, body, created_at, edited_at, deleted_at")
      .single();
    insertError = retry2.error as unknown;
    inserted = (retry2.data as typeof inserted) || null;
  }
  function isInsertedMessage(v: unknown): v is InsertedMessage {
    return typeof v === "object" && v !== null &&
      "id" in v && "sender_id" in v && "body" in v && "created_at" in v;
  }
  const msg: InsertedMessage | null = isInsertedMessage(inserted)
    ? inserted
    : null;
  const error =
    (insertError && typeof insertError === "object" && "message" in insertError)
      ? (insertError as { message: string })
      : null;
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[messages/:id POST] insert error", error.message);
    }
    // Add hint for common RLS failure
    const hint = /row-level security/.test(error.message)
      ? "RLS: zorg dat user in participants staat en policies zijn toegepast"
      : undefined;
    return NextResponse.json({ error: error.message, hint }, { status: 400 });
  }

  // Touch conversation updated_at
  await supabase.from("conversations").update({
    updated_at: new Date().toISOString(),
  }).eq("id", params.id);

  // Insert attachments
  type AttachmentOut = {
    id: string;
    url?: string | null;
    content_type?: string | null;
    storage_path?: string;
    mime_type?: string | null;
    size_bytes?: number | null;
  };
  const insertedAttachments: AttachmentOut[] = [];
  let attachmentsError: string | null = null;
  if (msg && attachments.length) {
    // Partition attachments
    const newOnes = attachments.filter((a) => !!a.storage_path);
    const legacyOnes = attachments.filter((a) => !a.storage_path && !!a.url);
    // Try new schema first (if any)
    if (newOnes.length) {
      try {
        const newRows = newOnes.map((a) => ({
          message_id: msg.id,
          storage_path: a.storage_path!,
          mime_type: a.mime_type || a.content_type || null,
          size_bytes: a.size_bytes ?? null,
        }));
        const { data: insNew, error: errNew } = await supabase
          .from("message_attachments")
          .insert(newRows)
          .select("id,message_id,storage_path,mime_type,size_bytes");
        if (errNew && /column .*storage_path/i.test(errNew.message)) {
          // Table doesn't have new columns; fall back to legacy for these (requires url)
          const fallbacks = newOnes.filter((a) => !!a.url).map((a) => ({
            message_id: msg.id,
            url: a.url!,
            content_type: a.mime_type || a.content_type || null,
          }));
          if (fallbacks.length) {
            const { data: insLegacyFromNew, error: errLegacyFromNew } =
              await supabase
                .from("message_attachments")
                .insert(fallbacks)
                .select("id,message_id,url,content_type");
            if (errLegacyFromNew) {
              attachmentsError = errLegacyFromNew.message ||
                "attachment_insert_failed";
            } else if (insLegacyFromNew) {
              insertedAttachments.push(
                ...(insLegacyFromNew as {
                  id: string;
                  message_id: string;
                  url: string;
                  content_type?: string | null;
                }[]).map((r) => ({
                  id: r.id,
                  url: r.url,
                  content_type: r.content_type || null,
                })),
              );
            }
          }
        } else if (errNew) {
          attachmentsError = errNew.message || "attachment_insert_failed";
          if (process.env.NODE_ENV !== "production") {
            console.error(
              "[messages/:id POST] attachments(new) insert error",
              errNew.message,
            );
          }
        } else if (insNew) {
          insertedAttachments.push(
            ...(insNew as {
              id: string;
              message_id: string;
              storage_path: string;
              mime_type?: string | null;
              size_bytes?: number | null;
            }[]).map((r) => ({
              id: r.id,
              storage_path: r.storage_path,
              mime_type: r.mime_type || null,
              size_bytes: r.size_bytes ?? null,
            })),
          );
        }
      } catch (e) {
        attachmentsError = (e as Error)?.message || "attachment_insert_failed";
      }
    }
    // Then try legacy ones
    if (legacyOnes.length) {
      try {
        const legacyRows = legacyOnes.map((a) => ({
          message_id: msg.id,
          url: a.url!,
          content_type: a.content_type || a.mime_type || null,
        }));
        const { data: insOld, error: errOld } = await supabase
          .from("message_attachments")
          .insert(legacyRows)
          .select("id,message_id,url,content_type");
        if (
          errOld &&
          (/column .*url/i.test(errOld.message) ||
            /null value in column "storage_path"/i.test(errOld.message))
        ) {
          // DB uses new schema only; can't save url-only attachments
          attachmentsError = errOld.message || "attachment_insert_failed";
        } else if (errOld) {
          attachmentsError = errOld.message || "attachment_insert_failed";
        } else if (insOld) {
          insertedAttachments.push(
            ...(insOld as {
              id: string;
              message_id: string;
              url: string;
              content_type?: string | null;
            }[]).map((r) => ({
              id: r.id,
              url: r.url,
              content_type: r.content_type || null,
            })),
          );
        }
      } catch (e) {
        attachmentsError = (e as Error)?.message || "attachment_insert_failed";
      }
    }
  }
  return NextResponse.json({
    ok: true,
    message: msg
      ? {
        id: msg.id,
        sender_id: msg.sender_id,
        body: msg.body,
        created_at: msg.created_at,
        edited_at: msg.edited_at,
        deleted_at: msg.deleted_at,
        attachments: insertedAttachments,
      }
      : null,
    attachments_error: attachmentsError,
  });
}

// PATCH edit message
export async function PATCH(request: Request) {
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
  const payload = await request.json();
  const messageId = String(payload.messageId || "");
  const newText = String(payload.text || "").trim().slice(0, 2000);
  if (!messageId || !newText) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { data: msg } = await supabase.from("messages").select(
    "id, sender_id, created_at, deleted_at",
  ).eq("id", messageId).maybeSingle();
  if (!msg || msg.sender_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (msg.deleted_at) {
    return NextResponse.json({ error: "deleted" }, { status: 400 });
  }
  if (Date.now() - new Date(msg.created_at).getTime() > 5 * 60 * 1000) {
    return NextResponse.json({ error: "window_closed" }, { status: 400 });
  }
  const { error } = await supabase.from("messages").update({
    body: newText,
    edited_at: new Date().toISOString(),
  }).eq("id", messageId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE (soft delete message or hard delete conversation)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
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

  const url = new URL(request.url);
  const isConversationDelete = url.searchParams.has("conversation");

  if (isConversationDelete) {
    // Delete entire conversation - verify user is participant
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, participants")
      .eq("id", params.id)
      .maybeSingle();
    if (
      !conv || !Array.isArray(conv.participants) ||
      !conv.participants.includes(user.id)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // Hard delete the conversation and all its messages
    const { error: msgError } = await supabase.from("messages").delete().eq(
      "conversation_id",
      params.id,
    );
    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 400 });
    }
    const { error: convError } = await supabase.from("conversations").delete()
      .eq("id", params.id);
    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } else {
    // Delete individual message (existing logic)
    const payload = await request.json();
    const messageId = String(payload.messageId || "");
    if (!messageId) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const { data: msg } = await supabase.from("messages").select(
      "id, sender_id",
    ).eq("id", messageId).maybeSingle();
    if (!msg || msg.sender_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { error } = await supabase.from("messages").update({
      deleted_at: new Date().toISOString(),
      body: "",
    }).eq("id", messageId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
}
