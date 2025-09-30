// app/api/categories/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env ontbreekt" }, { status: 500, headers: { "X-Category-Source": "error-env" } });
    }
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const { data, error } = await sb
      .from("categories")
      .select("id,name,parent_id,position,slug")
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: { "X-Category-Source": "error-db" } });
    }

    const rows = data || [];
    if (!rows.length) return new NextResponse(null, { status: 204, headers: { "X-Category-Source": "empty-db" } });

    const parents = rows.filter((r) => !r.parent_id);
    const byParent = new Map<string, { id: string; name: string; slug: string | null }[]>();
    for (const r of rows) {
      if (r.parent_id) {
        const arr = byParent.get(r.parent_id) || [];
        arr.push({ id: r.id, name: r.name, slug: r.slug || null });
        byParent.set(r.parent_id, arr);
      }
    }

    const shaped = parents.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      subcategories: (byParent.get(p.id) || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    }));

    if (!shaped.length) return new NextResponse(null, { status: 204, headers: { "X-Category-Source": "no-parents" } });
    return NextResponse.json(shaped, { status: 200, headers: { "X-Category-Source": "supabase" } });
  } catch (e: unknown) {
    const errorMessage = typeof e === "object" && e !== null && "message" in e ? (e as { message?: string }).message : "Onbekend";
    return NextResponse.json({ error: errorMessage || "Onbekend" }, { status: 500, headers: { "X-Category-Source": "exception" } });
  }
}
