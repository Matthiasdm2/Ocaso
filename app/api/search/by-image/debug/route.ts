export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const limit = (form.get('limit') as string) || '24';
  if (!file) return NextResponse.json({ error: 'file verplicht' }, { status: 400 });

  const svc = process.env.IMAGE_SEARCH_URL || 'http://localhost:9000/search';
  const f = new FormData();
  f.append('file', file, (file as File).name || 'query.jpg');
  f.append('limit', String(limit));

  const r = await fetch(svc, { method: 'POST', body: f });
  const json = await r.json();
  return NextResponse.json(json, { status: r.status });
}
