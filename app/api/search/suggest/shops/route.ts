export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';

type ShopSuggestion = { name: string; slug: string };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') || '6')));

    const supabase = supabaseServer();

    const toOut = (rows?: Array<{ shop_name: string | null; shop_slug: string | null }>): ShopSuggestion[] => {
      const out: ShopSuggestion[] = [];
      const seen = new Set<string>();
      for (const r of rows || []) {
        const name = (r.shop_name || '').trim();
        const slug = (r.shop_slug || '').trim();
        if (!name || !slug) continue;
        const key = `${name.toLowerCase()}|${slug.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name, slug });
        if (out.length >= limit) break;
      }
      return out;
    };

    if (q) {
      const prefix = q.replace(/[%_]/g, '').toLowerCase();
      // Prefix on shop_name
      const { data: p1, error: pe1 } = await supabase
        .from('profiles')
        .select('shop_name, shop_slug')
        .eq('is_business', true)
        .not('shop_name', 'is', null)
        .not('shop_slug', 'is', null)
        .ilike('shop_name', `${prefix}%`)
        .limit(limit);
      if (pe1) console.warn('shops suggest prefix error', pe1.message);

      let collected = toOut(p1);
      if (collected.length < limit) {
        // Contains on shop_name
        const { data: p2, error: pe2 } = await supabase
          .from('profiles')
          .select('shop_name, shop_slug')
          .eq('is_business', true)
          .not('shop_name', 'is', null)
          .not('shop_slug', 'is', null)
          .ilike('shop_name', `%${prefix}%`)
          .limit(limit * 2);
        if (pe2) console.warn('shops suggest contains error', pe2.message);
        collected = toOut([...(p1 || []), ...(p2 || [])]);
      }

      // If still room, try slug contains
      if (collected.length < limit) {
        const { data: p3, error: pe3 } = await supabase
          .from('profiles')
          .select('shop_name, shop_slug')
          .eq('is_business', true)
          .not('shop_name', 'is', null)
          .not('shop_slug', 'is', null)
          .ilike('shop_slug', `%${prefix}%`)
          .limit(limit * 2);
        if (pe3) console.warn('shops suggest slug contains error', pe3.message);
        collected = toOut([...(p3 || []), ...collected]);
      }

      return NextResponse.json({ suggestions: collected });
    }

    // Trending/recent fallback: simple recent businesses with shop name
    const { data: recent, error } = await supabase
      .from('profiles')
      .select('shop_name, shop_slug, updated_at, created_at')
      .eq('is_business', true)
      .not('shop_name', 'is', null)
      .not('shop_slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) console.warn('shops suggest trending error', error.message);
    return NextResponse.json({ suggestions: toOut(recent) });
  } catch (e) {
    console.error('shops suggest error', e);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
