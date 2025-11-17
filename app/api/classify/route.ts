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
    const classifierToken = process.env.CLASSIFIER_TOKEN;

    // Use a short fetch timeout to avoid long-hanging requests
    const controller = new AbortController();
    const timeoutMs = Number(process.env.CLASSIFIER_TIMEOUT_MS || '8000');
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (classifierToken) headers['Authorization'] = `Bearer ${classifierToken}`;

    const res = await fetch(classifierUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    const contentType = res.headers.get('content-type') || 'application/json';

    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Distinguish timeout/abort
    if (typeof (err as Error)?.name === 'string' && (err as Error).name === 'AbortError') {
      return NextResponse.json({ error: 'proxy_timeout', message: 'Upstream classifier timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'proxy_error', message }, { status: 500 });
  }
}
