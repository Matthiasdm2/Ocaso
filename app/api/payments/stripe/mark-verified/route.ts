export const runtime = 'nodejs';
import { supabaseServer } from '@/lib/supabaseServer';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Get auth token from Authorization header if present
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
  // Try to get user via existing cookies (server context)
  let supabase = supabaseServer();
  let { data: { user } } = await supabase.auth.getUser();
    if (!user && token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const alt = createSupabaseClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const got = await alt.auth.getUser();
      if (got.data.user) {
        user = got.data.user;
        // Recreate a compatible interface with alt for subsequent calls
        supabase = {
          auth: alt.auth,
          from: alt.from.bind(alt)
        } as typeof supabase;
      }
    }
    if (!user?.id) return new Response(JSON.stringify({ error: 'not_authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const { error } = await supabase.from('profiles').upsert({ id: user.id, business: { verified: true } }, { onConflict: 'id' });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
