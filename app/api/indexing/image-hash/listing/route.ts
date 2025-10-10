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
    const body = await req.json().catch(() => null) as
        | { listing_id?: string }
        | null;
    const listing_id = body?.listing_id;
    if (!listing_id) {
        return NextResponse.json({ error: "listing_id required" }, {
            status: 400,
        });
    }

    const { data: listing } = await supabase
        .from("listings")
        .select("id,images")
        .eq("id", listing_id)
        .single();

    if (!listing) {
        return NextResponse.json({ error: "Listing not found" }, {
            status: 404,
        });
    }
    type ListingRow = { id: string; images: string[] | null };
    const row = listing as ListingRow;
    const images: string[] = Array.isArray(row.images)
        ? row.images.filter((u: string) => typeof u === "string" && !!u)
        : [];
    if (images.length === 0) {
        return NextResponse.json({ success: true, updated: 0 });
    }

    let updated = 0;
    for (const url of images) {
        const buf = await fetchImageBuffer(url);
        if (!buf) continue;
        try {
            const hash = await computeAHash64(buf);
            const { error } = await supabase
                .from("listing_image_hashes")
                .upsert({ listing_id, image_url: url, ahash_64: hash }, {
                    onConflict: "listing_id,image_url",
                });
            if (!error) updated++;
            // Optional: compute CLIP embedding if enabled
            if ((process.env.IMAGE_SEARCH_EMBEDDINGS_ENABLED || "0") === "1") {
                try {
                    const emb = await computeImageEmbedding(buf);
                    await supabase
                        .from("listing_image_embeddings")
                        .upsert(
                            { listing_id, image_url: url, embedding: emb },
                            { onConflict: "listing_id,image_url" },
                        );
                } catch {
                    // ignore embedding failures
                }
            }
        } catch {
            // ignore
        }
    }
    return NextResponse.json({ success: true, updated });
}
