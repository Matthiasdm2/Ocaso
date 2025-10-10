export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const limit = (form.get("limit") as string) || "24";
    if (!file) {
        return NextResponse.json({ error: "file verplicht" }, { status: 400 });
    }

    const svc = process.env.IMAGE_SEARCH_URL || "http://localhost:9000/search";
    const f = new FormData();
    f.append("file", file, (file as File).name || "query.jpg");
    f.append("limit", String(limit));

    const r = await fetch(svc, { method: "POST", body: f });
    const json: {
        ok?: boolean;
        results?: Array<{ listing_id?: string; score?: number }>;
    } = await r.json();

    // If service returned ANN results, filter to existing listings and return ordered ids
    if (r.ok && json && Array.isArray(json.results)) {
        const supabase = supabaseServer();
        const rawIds: string[] =
            (json.results as Array<{ listing_id?: string }>)
                .map((h) => h?.listing_id)
                .filter((v): v is string => typeof v === "string");
        console.log(
            "[by-image] ANN results:",
            json.results.length,
            "raw ids:",
            rawIds.slice(0, 5),
        );
        // Filter to valid UUIDs to avoid Supabase query errors on non-UUID ids like 'seed1'
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validIds = rawIds.filter((id) => uuidRegex.test(id));
        console.log("[by-image] valid UUID ids:", validIds.length);
        if (validIds.length > 0) {
            const { data } = await supabase
                .from("listings")
                .select("id", { count: undefined })
                .in("id", validIds);
            const existing = new Set<string>(
                (data || []).map((r: { id: string }) => r.id),
            );
            const ordered = validIds.filter((id) => existing.has(id));
            console.log(
                "[by-image] existing ids:",
                existing.size,
                "filtered ordered:",
                ordered.length,
            );
            // Prefer filtered ids, but if filtering yields none (e.g. local env or RLS), fall back to raw ids
            const out = ordered.length > 0 ? ordered : validIds;
            console.log("[by-image] returning ids:", out.length);
            return NextResponse.json({ ok: true, ids: out }, { status: 200 });
        }
    }

    return NextResponse.json(json, { status: r.status });
}
