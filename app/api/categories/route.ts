export const runtime = "nodejs";
// app/api/categories/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env ontbreekt" }, {
        status: 500,
        headers: { "X-Category-Source": "error-env" },
      });
    }
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const { data, error } = await sb
      .from("categories")
      .select("id,name,slug,sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, {
        status: 500,
        headers: { "X-Category-Source": "error-db" },
      });
    }

    const rows = data || [];
    if (!rows.length) {
      return new NextResponse(null, {
        status: 204,
        headers: { "X-Category-Source": "empty-db" },
      });
    }

    // Get subcategories for each category
    const categoriesWithSubs = [];
    for (const cat of rows) {
      const { data: subs, error: subsError } = await sb
        .from("subcategories")
        .select("id,name,slug")
        .eq("category_id", cat.id)
        .order("name", { ascending: true });

      if (!subsError) {
        categoriesWithSubs.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          subcategories: (subs || []).map((sub) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
          })),
        });
      }
    }

    if (!categoriesWithSubs.length) {
      return new NextResponse(null, {
        status: 204,
        headers: { "X-Category-Source": "no-parents" },
      });
    }
    return NextResponse.json(categoriesWithSubs, {
      status: 200,
      headers: { "X-Category-Source": "supabase" },
    });
  } catch (e: unknown) {
    const errorMessage = typeof e === "object" && e !== null && "message" in e
      ? (e as { message?: string }).message
      : "Onbekend";
    return NextResponse.json({ error: errorMessage || "Onbekend" }, {
      status: 500,
      headers: { "X-Category-Source": "exception" },
    });
  }
}
