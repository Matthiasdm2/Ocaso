/* eslint-disable simple-import-sort/imports */
// eslint-disable-next-line simple-import-sort/imports
import { type NextRequest, NextResponse } from "next/server";

import { computeImageEmbedding } from "@/lib/imageEmbedding";
import { computeAHash64 } from "@/lib/imageHash";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchImageBuffer(
    url: string,
    timeoutMs = 4000,
    maxBytes = 4_000_000,
): Promise<Buffer | null> {
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) return null;
        const contentLength = res.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxBytes) {
            return null;
        }
        const arr = await res.arrayBuffer();
        if (arr.byteLength > maxBytes) return null;
        return Buffer.from(arr);
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-indexer-secret") || "";
    if (!process.env.INDEXER_SECRET || secret !== process.env.INDEXER_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = supabaseServer();
    const { batch = 50 } = (await req.json().catch(() => ({}))) as {
        batch?: number;
    };

    // Find listings that either have no images hashed yet or are missing some hashes
    // Strategy: pull recent listings and ones without any hash entries first
    const { data: listings } = await supabase
        .from("listings")
        .select("id,images,updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

    const target: Array<{ id: string; images: string[] }> = [];
    for (const l of listings || []) {
        const imgs: string[] = Array.isArray(l.images)
            ? l.images.filter((u: string) => typeof u === "string" && !!u)
            : [];
        if (imgs.length === 0) continue;
        target.push({ id: l.id as string, images: imgs });
    }

    let processed = 0;
    let upserts = 0;
    for (const t of target.slice(0, Math.max(1, Math.min(200, batch)))) {
        for (const url of t.images) {
            const buf = await fetchImageBuffer(url);
            if (!buf) continue;
            try {
                const hash = await computeAHash64(buf);
                const { error } = await supabase
                    .from("listing_image_hashes")
                    .upsert({
                        listing_id: t.id,
                        image_url: url,
                        ahash_64: hash,
                    }, { onConflict: "listing_id,image_url" });
                if (!error) upserts++;
                if (
                    (process.env.IMAGE_SEARCH_EMBEDDINGS_ENABLED || "0") === "1"
                ) {
                    try {
                        const emb = await computeImageEmbedding(buf);
                        await supabase
                            .from("listing_image_embeddings")
                            .upsert({
                                listing_id: t.id,
                                image_url: url,
                                embedding: emb,
                            }, { onConflict: "listing_id,image_url" });
                    } catch {
                        // ignore
                    }
                }
            } catch {
                // ignore
            }
        }
        processed++;
    }

    return NextResponse.json({ success: true, processed, upserts });
}
