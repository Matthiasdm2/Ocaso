export const runtime = "nodejs";
import { NextResponse } from 'next/server';

import { supabaseServiceRole } from '@/lib/supabaseServiceRole';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { files } = body as { files?: Record<string,string> };
    if (!files || typeof files !== 'object') return NextResponse.json({ error: 'missing_files' }, { status: 400 });

    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '') || null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = supabaseServiceRole();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token as string).catch(() => ({ data: { user: null }, error: { message: 'auth_failed' } }));
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Persist stripe file ids in profiles.stripe_files (JSONB)
    const updatePayload = { stripe_files: files };
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('profile/stripe-files error', e);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
