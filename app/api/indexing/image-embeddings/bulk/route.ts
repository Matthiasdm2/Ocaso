export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

type ListingRow = { id: string; images?: string[] | null };

export async function POST(req: Request) {
    // Simple auth via secret header or query param
    const url = new URL(req.url);
    const secret = req.headers.get("x-indexer-secret") ||
        url.searchParams.get("secret") || "";
    if (!process.env.INDEXER_SECRET || secret !== process.env.INDEXER_SECRET) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limitParam = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(Number(limitParam || 200) || 200, 1000));

    const supabase = supabaseServer();
    const { data } = await supabase
        .from("listings")
        .select("id,images", { count: undefined })
        .order("created_at", { ascending: false })
        .limit(limit);

    const rows = (data || []) as ListingRow[];
    if (!rows.length) return NextResponse.json({ ok: true, indexed: 0 });

    const svcIndex = process.env.IMAGE_SEARCH_INDEX_URL ||
        (process.env.IMAGE_SEARCH_URL
            ? String(process.env.IMAGE_SEARCH_URL).replace("/search", "/index")
            : "") ||
        "http://localhost:9000/index";

    let ok = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const row of rows) {
        try {
            const img = Array.isArray(row.images) && row.images.length > 0
                ? row.images[0]
                : null;
            if (!img) {
                skipped++;
                continue;
            }

            // Fetch image bytes
            const res = await fetch(img);
            if (!res.ok) {
                skipped++;
                continue;
            }
            const blob = await res.blob();

            // Build multipart form
            const fd = new FormData();
            fd.append("listing_id", row.id);
            fd.append("image_url", img);
            fd.append("file", blob, "image.jpg");

            const r = await fetch(svcIndex, { method: "POST", body: fd });
            if (r.ok) {
                ok++;
                console.log(`[bulk-index] indexed ${row.id} (${img})`);
            } else {
                const j = await r.text();
                errors.push({ id: row.id, error: j.slice(0, 200) });
                console.log(
                    `[bulk-index] failed ${row.id}: ${j.slice(0, 100)}`,
                );
            }
        } catch (e) {
            errors.push({
                id: row.id,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }

    return NextResponse.json({ ok: true, indexed: ok, skipped, errors });
}
