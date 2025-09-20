import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabaseClient';

// Controleer of een shop_slug nog vrij is
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get('slug') || '').trim().toLowerCase();
    if (!slug) return NextResponse.json({ available: false, reason: 'empty' }, { status: 400 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('shop_slug', slug)
      .limit(1);

    if (error) return NextResponse.json({ available: false, error: error.message }, { status: 500 });
    const taken = !!(data && data.length > 0);
    return NextResponse.json({ available: !taken });
  } catch (e) {
    return NextResponse.json({ available: false, error: (e as Error).message }, { status: 500 });
  }
}