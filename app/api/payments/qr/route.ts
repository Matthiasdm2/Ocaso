import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_BUCKET = process.env.NEXT_PUBLIC_CHAT_BUCKET || "chat-attachments";

// POST: Generate EPC QR for listing and send in chat as attachment
// body: { listingId: string }
export async function POST(request: Request) {
  // Identify user (buyer)
  const supabase = supabaseServer();
  let user = null;
  try {
    const { data: { user: u } } = await supabase.auth.getUser();
    user = u;
  } catch (authError) {
    console.warn("[payments/qr] Auth error:", authError);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const listingId = String(body.listingId || "").trim();
  if (!listingId) {
    return NextResponse.json({ error: "missing_listingId" }, { status: 400 });
  }

  // Load listing with seller
  const { data: listing } = await supabase
    .from("listings")
    .select("id, price, title, seller_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "listing_not_found" }, { status: 404 });
  }
  const sellerId: string | null =
    (listing as { seller_id?: string | null }).seller_id || null;
  if (!sellerId) {
    return NextResponse.json({ error: "seller_missing" }, { status: 400 });
  }
  // Prevent requesting a payment from yourself (would yield null recipient)
  if (sellerId === user.id) {
    return NextResponse.json({
      error: "self_request_forbidden",
      detail: "Je kan jezelf geen betaalverzoek sturen.",
    }, { status: 400 });
  }

  // Load seller bank details
  const { data: seller } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, bank")
    .eq("id", sellerId)
    .maybeSingle();
  if (!seller) {
    return NextResponse.json({ error: "seller_not_found" }, { status: 404 });
  }
  const bank =
    (seller as { bank?: { iban?: string; bic?: string } | null }).bank || null;
  const rawIban = bank && typeof bank.iban === "string" ? bank.iban : "";
  const rawBic = bank && typeof bank.bic === "string" ? bank.bic : "";
  const rawName =
    ((seller as { display_name?: string | null; full_name?: string | null })
      .display_name ||
      (seller as { full_name?: string | null }).full_name ||
      "Verkoper").toString();
  const sanitize = (v: string, max = 70) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/[^\x20-\x7E]/g, "") // strip non-ascii
      .slice(0, max);
  const payeeName = sanitize(rawName, 70);
  const iban = rawIban.replace(/\s+/g, "").toUpperCase();
  const bic = (rawBic || "").toUpperCase(); // BIC optioneel voor Belgische betalingen
  if (!iban) {
    return NextResponse.json({ error: "seller_missing_iban" }, { status: 400 });
  }

  // Build EPC QR payload
  const price = Number((listing as { price?: unknown }).price || 0);
  const amount = isFinite(price) && price > 0 ? price : 0;
  const amountLine = amount > 0 ? `EUR${amount.toFixed(2)}` : "";
  const remittance = `Ocaso ${listingId}`.slice(0, 35);
  const lines = [
    "BCD",
    "001",
    "1",
    "SCT",
    bic, // Keep BIC as is (empty for Belgian domestic payments)
    payeeName,
    iban,
    amountLine,
    "", // Purpose: empty for maximum compatibility
    remittance,
  ];
  const epc = lines.join("\n") + "\n";
  console.log("EPC QR data:", epc);

  // Generate PNG with parameters optimized for bank app scanning
  // Higher error correction and scale for better compatibility
  const png: Buffer = await QRCode.toBuffer(epc, {
    type: "png",
    errorCorrectionLevel: "L",
    scale: 8,
    margin: 4,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  // Ensure conversation exists (buyer <-> seller for this listing)
  const admin = supabaseServiceRole();
  const participants = [user.id, sellerId].sort();
  const recipientId: string = sellerId; // other participant is always the seller here (buyer is user)
  // Safety: ensure we have a valid recipient
  if (!recipientId) {
    return NextResponse.json({
      error: "recipient_missing",
      detail: "Geen geldige ontvanger voor bericht.",
    }, { status: 400 });
  }
  let conversationId: string | null = null;
  try {
    const query = admin
      .from("conversations")
      .select("id, participants, listing_id")
      .contains("participants", participants)
      .eq("listing_id", listingId)
      .limit(5);
    const { data: existing } = await query;
    const match = (existing || []).find((c) =>
      Array.isArray(c.participants) && c.participants.length === 2 &&
      c.participants[0] === participants[0] &&
      c.participants[1] === participants[1]
    );
    if (match) {
      conversationId = match.id as string;
    } else {
      const { data: created, error: insErr } = await admin
        .from("conversations")
        .insert({ participants, listing_id: listingId })
        .select("id")
        .single();
      if (insErr) throw insErr;
      conversationId = (created as { id: string }).id;
    }
  } catch (e) {
    return NextResponse.json({
      error: "conversation_failed",
      detail: (e as Error)?.message,
    }, { status: 500 });
  }
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_missing" }, {
      status: 500,
    });
  }

  // Insert a message (from buyer) and upload attachment
  const messageText =
    "Scan deze code via de banking app en betaal 'het overeengekomen' bedrag.";
  // Insert message using user-scoped client (RLS requires sender to be the authed user)
  const baseMessage = {
    conversation_id: conversationId,
    sender_id: user.id,
    body: messageText,
  } as Record<string, unknown>;
  // Try with listing_id (some DBs have NOT NULL on messages.listing_id)
  let userAttempt = await supabase
    .from("messages")
    .insert({
      ...baseMessage,
      listing_id: listingId,
      recipient_id: recipientId,
    } as never)
    .select("id, created_at")
    .single();
  let { data: msg, error: msgErr } = userAttempt;
  if (msgErr || !msg) {
    const errText = msgErr?.message || "";
    const missingListing = errText.includes("column") &&
      errText.includes("listing_id");
    const missingRecipient = errText.includes("column") &&
      errText.includes("recipient_id");
    const nullRecipient = errText.includes("null value") &&
      errText.includes("recipient_id");
    if (missingListing) {
      // Retry without listing_id for schemas that don't have this column
      userAttempt = await supabase
        .from("messages")
        .insert(
          (missingRecipient || nullRecipient
            ? baseMessage
            : { ...baseMessage, recipient_id: recipientId }) as never
        )
        .select("id, created_at")
        .single();
      msg = userAttempt.data as typeof msg;
      msgErr = userAttempt.error as typeof msgErr;
    }
    if ((missingRecipient || nullRecipient) && (msgErr || !msg)) {
      // Retry omitting recipient_id in case schema lacks or allows null
      userAttempt = await supabase
        .from("messages")
        .insert({ ...baseMessage, listing_id: listingId } as never)
        .select("id, created_at")
        .single();
      msg = userAttempt.data as typeof msg;
      msgErr = userAttempt.error as typeof msgErr;
    }
  }
  if (msgErr || !msg) {
    console.warn(
      "payments/qr message insert failed via user client; retrying with admin:",
      msgErr?.message,
    );
    // Admin attempt with listing_id first
    let adminAttempt = await admin
      .from("messages")
      .insert({
        ...baseMessage,
        listing_id: listingId,
        recipient_id: recipientId,
      })
      .select("id, created_at")
      .single();
    msg = adminAttempt.data as typeof msg;
    msgErr = adminAttempt.error as typeof msgErr;
    if (msgErr || !msg) {
      const errText = msgErr?.message || "";
      const missingListing = errText.includes("column") &&
        errText.includes("listing_id");
      const missingRecipient = errText.includes("column") &&
        errText.includes("recipient_id");
      const nullRecipient = errText.includes("null value") &&
        errText.includes("recipient_id");
      if (missingListing) {
        adminAttempt = await admin
          .from("messages")
          .insert(
            missingRecipient || nullRecipient
              ? baseMessage
              : { ...baseMessage, recipient_id: recipientId },
          )
          .select("id, created_at")
          .single();
        msg = adminAttempt.data as typeof msg;
        msgErr = adminAttempt.error as typeof msgErr;
      }
      if ((missingRecipient || nullRecipient) && (msgErr || !msg)) {
        adminAttempt = await admin
          .from("messages")
          .insert({ ...baseMessage, listing_id: listingId } as never)
          .select("id, created_at")
          .single();
        msg = adminAttempt.data as typeof msg;
        msgErr = adminAttempt.error as typeof msgErr;
      }
      if (msgErr || !msg) {
        console.error(
          "payments/qr message insert failed (admin fallback):",
          msgErr?.message,
        );
        return NextResponse.json({
          error: "message_failed",
          detail: msgErr?.message || "insert_failed",
        }, { status: 500 });
      }
    }
  }

  // Upload PNG to storage
  const fileName = `epc-qr-${iban}.png`;
  const path = `conversations/${conversationId}/${fileName}`;
  const { error: upErr } = await admin.storage.from(CHAT_BUCKET).upload(
    path,
    png,
    { contentType: "image/png", upsert: false },
  );
  if (upErr) {
    return NextResponse.json(
      { error: "upload_failed", detail: upErr.message },
      { status: 500 },
    );
  }
  const { data: pub } = admin.storage.from(CHAT_BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl || null;

  // Link as message attachment (prefer new schema: storage_path/mime_type/size_bytes, fallback to legacy url/content_type)
  try {
    const { error: attErr } = await admin
      .from("message_attachments")
      .insert({
        message_id: (msg as { id: string }).id,
        storage_path: path,
        mime_type: "image/png",
        size_bytes: png.length,
      });
    if (attErr) {
      // Try legacy columns
      await admin.from("message_attachments").insert({
        message_id: (msg as { id: string }).id,
        url: publicUrl || path,
        content_type: "image/png",
      });
    }
  } catch { /* ignore attach error */ }

  // Touch conv updated_at
  await admin.from("conversations").update({
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);

  return NextResponse.json({ ok: true, conversationId, qr_url: publicUrl });
}
