import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Support both images-based classification and text (future-proof)
    const classifierUrl = process.env.CLASSIFIER_URL || process.env.NEXT_PUBLIC_CLASSIFIER_URL || "http://localhost:8000/classify";
    const token = process.env.CLASSIFIER_TOKEN || process.env.NEXT_PUBLIC_CLASSIFIER_TOKEN;

    // Mock behavior if we want development fast-path
    if ((process.env.CLASSIFIER_MOCK || process.env.NEXT_PUBLIC_CLASSIFIER_MOCK) === "true") {
      const mock = { category_index: 4, confidence: 0.3, received: body };
      return NextResponse.json(mock, { status: 200 });
    }

    const controller = new AbortController();
    const timeoutMs = Number(process.env.CLASSIFIER_TIMEOUT_MS || 8000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(classifierUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { error: "no-json" }, { status: res.status });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Classifier request timed out" }, { status: 504 });
    }
    console.error("/api/classify error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
