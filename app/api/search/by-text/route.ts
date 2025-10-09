export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.formData();
  const q = (form.get('q') as string) || '';
  const limit = (form.get('limit') as string) || '24';
  if (!q) return NextResponse.json({ error: 'q verplicht' }, { status: 400 });

  const svc = process.env.IMAGE_SEARCH_TEXT_URL || process.env.IMAGE_SEARCH_URL?.replace('/search', '/search-text') || 'http://localhost:9000/search-text';
  const f = new FormData();
  f.append('q', q);
  f.append('limit', String(limit));

  const r = await fetch(svc, { method: 'POST', body: f });
  const json = await r.json();
  return NextResponse.json(json, { status: r.status });
}
