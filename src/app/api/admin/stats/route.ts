import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const expected = process.env.ADMIN_TOKEN;
  return expected && token === expected;
}

export async function GET(req: NextRequest) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // TODO: vervang door je echte tabellen of RPC's
    const { count: usersCount } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const { count: listingsCount } = await sb.from('listings').select('*', { count: 'exact', head: true });

    return NextResponse.json({ users: usersCount ?? 0, listings: listingsCount ?? 0 });
  } catch (err: any) {
    logger.error({ err }, 'admin/stats failed');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
