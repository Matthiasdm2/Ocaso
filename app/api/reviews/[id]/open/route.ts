import { NextResponse } from 'next/server';

import { getServerUser } from '@/lib/getServerUser';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// POST /api/reviews/:id/open
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { user } = await getServerUser(req);
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  const reviewId = params.id;
  if (!reviewId) return NextResponse.json({ error: 'Review id ontbreekt' }, { status: 400 });

  // Best-effort insert (ignore duplicate)
  try {
    const { error } = await supabase.from('review_opens').upsert({ user_id: user.id, review_id: reviewId }, { onConflict: 'user_id,review_id' });
    if (error) {
      return NextResponse.json({ error: 'Kon open status niet opslaan' }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Server fout' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
