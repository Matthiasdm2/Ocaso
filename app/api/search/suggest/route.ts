export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getSynonymTerms } from "@/lib/searchSynonyms";
import { supabaseServer } from "@/lib/supabaseServer";
import { toURL } from "@/lib/url";

// Simple, robust suggest endpoint
// - If q provided: prefix + contains matches on listing titles (distinct), limited
// - If no q: return trending recent titles
export async function GET(req: Request) {
    try {
    const { searchParams } = toURL(req.url);
        const q = (searchParams.get("q") || "").trim();
        const limit = Math.max(
            1,
            Math.min(20, Number(searchParams.get("limit") || "8")),
        );

        const supabase = supabaseServer();

        // When a query is provided, try prefix first, then contains, and merge distinct
        if (q) {
            const prefix = q.replace(/[%_]/g, "").toLowerCase();
            const synonymTerms = getSynonymTerms(prefix);

            // Prefix matches voor alle synoniemen
            const prefixPromises = synonymTerms.map(term =>
                supabase
                    .from("listings")
                    .select("title")
                    .ilike("title", `${term}%`)
                    .limit(Math.ceil(limit / synonymTerms.length))
            );

            // Contains matches voor alle synoniemen
            const containsPromises = synonymTerms.map(term =>
                supabase
                    .from("listings")
                    .select("title")
                    .ilike("title", `%${term}%`)
                    .limit(Math.ceil(limit / synonymTerms.length))
            );

            // Voer alle queries parallel uit
            const [prefixResults, containsResults] = await Promise.all([
                Promise.all(prefixPromises),
                Promise.all(containsPromises)
            ]);

            const uniq = new Set<string>();
            const out: string[] = [];

            // Verwerk resultaten
            for (const result of [...prefixResults, ...containsResults]) {
                if (result.error) {
                    console.warn("suggest error", result.error.message);
                    continue;
                }
                for (const r of result.data || []) {
                    const t = (r?.title || "").trim();
                    if (!t) continue;
                    const key = t.toLowerCase();
                    if (uniq.has(key)) continue;
                    uniq.add(key);
                    out.push(t);
                    if (out.length >= limit) break;
                }
                if (out.length >= limit) break;
            }

            return NextResponse.json({ suggestions: out });
        }

        // Trending fallback: latest distinct titles
        const { data: recent, error } = await supabase
            .from("listings")
            .select("title, created_at")
            .order("created_at", { ascending: false })
            .limit(50);
        if (error) {
            console.warn("suggest trending error", error.message);
        }
        const uniq = new Set<string>();
        const out: string[] = [];
        for (const r of recent || []) {
            const t = (r?.title || "").trim();
            if (!t) continue;
            const key = t.toLowerCase();
            if (uniq.has(key)) continue;
            uniq.add(key);
            out.push(t);
            if (out.length >= limit) break;
        }
        return NextResponse.json({ suggestions: out });
    } catch (e) {
        console.error("suggest error", e);
        return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
}
