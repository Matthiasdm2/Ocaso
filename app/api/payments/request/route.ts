import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseServiceRole } from '@/lib/supabaseServiceRole';

// POST: Buyer requests a payment; creates/ensures conversation and posts a request message with a CTA token
// body: { listingId: string }
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const listingId = String(body.listingId || '').trim();
  const shippingMode: 'pickup' | 'ship' | undefined = body?.shipping?.mode;
  if (!listingId) return NextResponse.json({ error: 'missing_listingId' }, { status: 400 });

  // Load listing to identify seller
  const { data: listing } = await supabase
    .from('listings')
    .select('id,seller_id')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  const sellerId: string | null = (listing as { seller_id?: string | null }).seller_id || null;
  if (!sellerId) return NextResponse.json({ error: 'seller_missing' }, { status: 400 });
  if (sellerId === user.id) return NextResponse.json({ error: 'self', detail: 'Je kan jezelf geen verzoek sturen.' }, { status: 400 });

  // Ensure conversation (buyer <-> seller for this listing)
  const admin = supabaseServiceRole();
  const participants = [user.id, sellerId].sort();
  let conversationId: string | null = null;
  try {
    const { data: existing } = await admin
      .from('conversations')
      .select('id,participants,listing_id,created_at')
      .contains('participants', participants)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true })
      .limit(5);
    const match = (existing || []).find(c => Array.isArray(c.participants) && c.participants.length === 2 && c.participants[0] === participants[0] && c.participants[1] === participants[1]);
    if (match) {
      conversationId = match.id as string;
    } else {
      const { data: created, error: insErr } = await admin
        .from('conversations')
        .insert({ participants, listing_id: listingId })
        .select('id')
        .single();
      if (insErr) throw insErr;
      conversationId = (created as { id: string }).id;
    }
  } catch (e) {
    return NextResponse.json({ error: 'conversation_failed', detail: (e as Error)?.message }, { status: 500 });
  }
  if (!conversationId) return NextResponse.json({ error: 'conversation_missing' }, { status: 500 });

  // Insert a message from the buyer with a recognizable token
  // Rendered specially in the chat UI for the seller.
  const bodyText = shippingMode === 'ship' ? 'De koper vraagt een betaalverzoek' : 'De koper vraagt een betaalverzoek (afhalen)';
  // Insert using user-scoped client to satisfy RLS. Include listing_id/recipient_id for stricter schemas.
  const { error: msgErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: bodyText, listing_id: listingId, recipient_id: sellerId })
    .select('id')
    .single();
  if (msgErr) {
    // Fallback attempts if schema differs
    const errText = msgErr.message || '';
    if (/column .*recipient_id/i.test(errText) || /null value in column "recipient_id"/i.test(errText)) {
      const { error: e2 } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, body: bodyText, listing_id: listingId })
        .select('id')
        .single();
      if (e2) return NextResponse.json({ error: 'message_failed', detail: e2.message }, { status: 500 });
    } else if (/column .*listing_id/i.test(errText)) {
      const { error: e3 } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, body: bodyText, recipient_id: sellerId })
        .select('id')
        .single();
      if (e3) return NextResponse.json({ error: 'message_failed', detail: e3.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'message_failed', detail: msgErr.message }, { status: 500 });
    }
  }

  // Touch updated_at
  await admin.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

  return NextResponse.json({ ok: true, conversationId, shippingMode: shippingMode || null });
}
