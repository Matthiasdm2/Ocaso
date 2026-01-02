import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured, returning empty categories');
      return NextResponse.json([], { status: 200 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('categories')
      .select('id,name,slug,icon_key,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Vercel CDN caching headers
    const headers = {
      'Cache-Control': 's-maxage=600, stale-while-revalidate=86400',
    };

    return NextResponse.json(data || [], { headers });
  } catch (error) {
    console.error('Error in categories API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
