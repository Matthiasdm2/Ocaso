export const runtime = "nodejs";
import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseServiceRole } from '@/lib/supabaseServiceRole';

// Buyer clicks "betaald" after scanning QR: mark order as paid (bank_transfer) and request Sendcloud label creation.
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const conversationId = String(payload.conversationId || '').trim();
  if (!conversationId) return NextResponse.json({ error: 'missing_conversation' }, { status: 400 });

  // Load conversation and listing
  const { data: conv } = await supabase
    .from('conversations')
    .select('id,participants,listing_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const parts = (conv as { participants?: string[] }).participants || [];
  if (!parts.includes(user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const listingId: string | null = (conv as { listing_id?: string | null }).listing_id || null;

  // Determine seller and buyer
  let sellerId: string | null = null;
  if (listingId) {
    const { data: listing } = await supabase
      .from('listings')
      .select('id,seller_id,price')
      .eq('id', listingId)
      .maybeSingle();
    sellerId = (listing as { seller_id?: string | null })?.seller_id || null;
  }
  const buyerId = user.id;
  if (sellerId && sellerId === buyerId) return NextResponse.json({ error: 'invalid_actor' }, { status: 400 });

  const admin = supabaseServiceRole();

  // Create or update order row for bank transfer; only for shipping flows.
  // If conversation/listing has shipping context stored elsewhere, you can validate here. For now, we gate via client usage.
  let orderId: string | null = null;
  try {
    // If an order already exists for this conversation/listing with bank_transfer, reuse latest
    let existing = null as { id: string } | null;
    if (listingId) {
      const { data: rows } = await admin
        .from('orders')
        .select('id')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(1);
      existing = (rows && rows[0]) || null;
    }
    if (existing) {
      orderId = existing.id;
      await admin.from('orders').update({ state: 'paid_confirmed', payment_method: 'bank_transfer', sendcloud_status: 'requested' }).eq('id', orderId);
    } else {
      const insert: Record<string, unknown> = {
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        payment_method: 'bank_transfer',
        state: 'paid_confirmed',
        sendcloud_status: 'requested',
      };
      const { data: row } = await admin
        .from('orders')
        .insert(insert)
        .select('id')
        .single();
      orderId = (row as { id: string } | null)?.id || null;
    }
  } catch (e) {
    // continue without failing hard
  }

  // TODO: Integrate with Sendcloud API to create label using buyer shipping details.
  // For now we mark sendcloud_status=requested and let a backend job finalize.

  // Optional: post a confirmation message in the chat
  try {
    await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: buyerId, body: 'Betaald — label werd aangevraagd.' })
      .select('id')
      .single();
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, orderId });
}
