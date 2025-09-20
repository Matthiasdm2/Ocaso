import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';

function supabaseFromBearer(token?: string | null) {
  if (!token) return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    return null;
  }
}

// GET total unread count across all conversations
export async function GET(request: Request) {
  try {
    let supabase = supabaseServer();
    let user;
    try {
      const got = await supabase.auth.getUser();
      user = got.data.user;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.debug('[unread] getUser error', e);
    }
    if (!user) {
      const auth = request.headers.get('authorization');
      const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
      const alt = supabaseFromBearer(token);
      if (alt) {
        try {
          const got = await alt.auth.getUser();
          if (got.data.user) { user = got.data.user; supabase = alt; }
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') console.debug('[unread] alt getUser error', e);
        }
      }
    }
    if (!user) return NextResponse.json({ unread: 0 });
    const { data, error } = await supabase.rpc('conversation_overview');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    type Row = { unread_count: number | null };
    const arr: Row[] = Array.isArray(data) ? (data as Row[]) : [];
    const total = arr.reduce((sum, r) => sum + (r.unread_count || 0), 0);
    return NextResponse.json({ unread: total });
  } catch (e: unknown) {
    let msg = 'unexpected';
    if (typeof e === 'object' && e && 'message' in e) {
      const m = (e as { message?: unknown }).message;
      if (typeof m === 'string') msg = m;
    }
    if (process.env.NODE_ENV !== 'production') console.error('[unread] fatal', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
