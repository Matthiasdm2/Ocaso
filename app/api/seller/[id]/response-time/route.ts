export const runtime = "nodejs";
import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';

/*
  Berekent gemiddelde responstijd (eerste antwoord) per unieke gesprekspartner.
  Heuristiek:
  1. Vind alle messages waar seller (id param) de ontvanger is (recipient_id = sellerId)
  2. Groepeer per conversation (als kolom bestaat) of per (listing_id, sender_id)
  3. Voor elk gesprek: zoek het eerste antwoord van de seller NA de eerste binnenkomende message
  4. Responstijd = tijd tussen eerste inkomende en eerste antwoord
  5. Gemiddelde in minuten, afgerond
*/

export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sellerId = params.id;
  if (!sellerId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const supabase = supabaseServer();

  // Haal laatste N (limiet) berichten op waar seller betrokken is om query licht te houden
  // We halen zowel berichten TO als FROM seller binnen een redelijk venster (laatste 2000)
  const { data: rows, error } = await supabase
    .from('messages')
    .select('id,sender_id,recipient_id,created_at,listing_id')
    .or(`sender_id.eq.${sellerId},recipient_id.eq.${sellerId}`)
    .order('created_at', { ascending: true })
    .limit(2000);

  // RLS kan verhinderen dat een anonieme / andere gebruiker deze berichten ziet.
  if (error) {
    // Detecteer permission denied (Supabase geeft meestal code '42501' of message met 'permission denied')
    if ((error as { code?: string }).code === '42501' || /permission denied/i.test(error.message)) {
      return NextResponse.json({ averageMinutes: null, samples: 0, note: 'unauthorized' }, { status: 200 });
    }
    // Log error but return graceful response instead of 500
    console.error('[response-time] Error fetching messages:', error);
    return NextResponse.json({ averageMinutes: null, samples: 0, note: 'error' }, { status: 200 });
  }
  if (!rows || !rows.length) return NextResponse.json({ averageMinutes: null, samples: 0, note: 'empty' });

  // Groepeer conversaties adhv (listing_id, andere_participant)
  interface Msg { id: string; sender_id: string; recipient_id: string; created_at: string | null; listing_id: string | null; }
  const conversations: Record<string, Msg[]> = {};
  for (const r of rows as Msg[]) {
    const other = r.sender_id === sellerId ? r.recipient_id : r.sender_id;
    if (!other) continue;
    const key = `${r.listing_id || 'nolisting'}::${other}`;
    conversations[key] = conversations[key] || [];
    conversations[key].push(r);
  }

  const diffs: number[] = [];
  for (const msgs of Object.values(conversations)) {
    // Sorteer (zou al gesorteerd moeten zijn)
    msgs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    // Eerste inbound (naar seller)
    const firstInbound = msgs.find(m => m.recipient_id === sellerId);
    if (!firstInbound) continue;
    const firstInboundTime = new Date(firstInbound.created_at || 0).getTime();
    // Vind eerste reply NA die timestamp door seller
    const reply = msgs.find(m => m.sender_id === sellerId && new Date(m.created_at || 0).getTime() > firstInboundTime);
    if (!reply) continue; // geen antwoord (nog)
    const diffMs = new Date(reply.created_at || 0).getTime() - firstInboundTime;
    if (diffMs < 0) continue;
    const diffMin = diffMs / 60000;
    // Filter outliers: > 7 dagen negeren
    if (diffMin <= 7 * 24 * 60) diffs.push(diffMin);
  }

  if (!diffs.length) return NextResponse.json({ averageMinutes: null, samples: 0, note: 'no-replies' });
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return NextResponse.json({ averageMinutes: Math.round(avg), samples: diffs.length, note: 'ok' });
}
