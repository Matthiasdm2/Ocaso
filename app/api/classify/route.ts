export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

/**
 * Proxy route that forwards image classification requests to an internal
 * classifier service configured by the CLASSIFIER_URL env var. Keeps the
 * classifier URL off the client and avoids CSP/connect-src issues.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const classifierUrl = process.env.CLASSIFIER_URL || process.env.NEXT_PUBLIC_CLASSIFIER_URL || 'http://localhost:8000/classify';

    const res = await fetch(classifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const contentType = res.headers.get('content-type') || 'application/json';

    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'proxy_error', message }, { status: 500 });
  }
}
