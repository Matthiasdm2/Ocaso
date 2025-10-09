export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';

// Simple, robust suggest endpoint
// - If q provided: prefix + contains matches on listing titles (distinct), limited
// - If no q: return trending recent titles
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') || '8')));

    const supabase = supabaseServer();

    // When a query is provided, try prefix first, then contains, and merge distinct
    if (q) {
      const prefix = q.replace(/[%_]/g, '').toLowerCase();

      // Prefix matches
      const { data: d1, error: e1 } = await supabase
        .from('listings')
        .select('title')
        .ilike('title', `${prefix}%`)
        .limit(limit);
      if (e1) console.warn('suggest prefix error', e1.message);

      // Contains matches (if still need more)
      let d2: { title: string | null }[] = [];
      if (!d1 || d1.length < limit) {
        const { data, error } = await supabase
          .from('listings')
          .select('title')
          .ilike('title', `%${prefix}%`)
          .limit(limit * 2);
        if (error) console.warn('suggest contains error', error.message);
        d2 = data || [];
      }

      const uniq = new Set<string>();
      const out: string[] = [];
      for (const r of [...(d1 || []), ...d2]) {
        const t = (r?.title || '').trim();
        if (!t) continue;
        const key = t.toLowerCase();
        if (uniq.has(key)) continue;
        uniq.add(key);
        out.push(t);
        if (out.length >= limit) break;
      }
      return NextResponse.json({ suggestions: out });
    }

    // Trending fallback: latest distinct titles
    const { data: recent, error } = await supabase
      .from('listings')
      .select('title, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.warn('suggest trending error', error.message);
    }
    const uniq = new Set<string>();
    const out: string[] = [];
    for (const r of recent || []) {
      const t = (r?.title || '').trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (uniq.has(key)) continue;
      uniq.add(key);
      out.push(t);
      if (out.length >= limit) break;
    }
    return NextResponse.json({ suggestions: out });
  } catch (e) {
    console.error('suggest error', e);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
