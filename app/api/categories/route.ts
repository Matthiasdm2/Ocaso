export const runtime = "nodejs";
// app/api/categories/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Cache categories for 5 minutes
export const revalidate = 300; // 5 minutes in seconds
export const dynamic = "force-dynamic"; // Keep dynamic but use revalidate for caching

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// In-memory cache with TTL (5 minutes)
type CacheEntry = {
  data: any[];
  timestamp: number;
};
const cache: CacheEntry | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env ontbreekt" }, {
        status: 500,
        headers: { "X-Category-Source": "error-env" },
      });
    }

    // Check cache first (if we had a shared cache, but Next.js doesn't persist between requests)
    // So we rely on Next.js revalidate instead

    const sb = createClient(url, key, { auth: { persistSession: false } });

    // OPTIMIZED: Try to use the view first, fallback to optimized query if view doesn't exist
    let categoriesData: any[] = [];
    let subcategoriesData: any[] = [];
    let usingView = false;

    // Try the view first
    const viewResult = await sb
      .from("categories_with_subcategories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!viewResult.error && viewResult.data && viewResult.data.length > 0) {
      // View exists and works - use it
      categoriesData = viewResult.data;
      usingView = true;
    } else {
      // View doesn't exist - use optimized query with single JOIN instead of N+1
      const { data: cats, error: catsError } = await sb
        .from("categories")
        .select("id,name,slug,sort_order,icon_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (catsError) {
        return NextResponse.json({ error: catsError.message }, {
          status: 500,
          headers: { "X-Category-Source": "error-db" },
        });
      }

      categoriesData = cats || [];

      if (categoriesData.length > 0) {
        // Get all subcategories in one query instead of N+1
        const categoryIds = categoriesData.map((cat) => cat.id);
        const { data: subs, error: subsError } = await sb
          .from("subcategories")
          .select("id,name,slug,category_id")
          .in("category_id", categoryIds)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!subsError) {
          subcategoriesData = subs || [];
        }
      }
    }

    if (!categoriesData.length) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "X-Category-Source": "empty-db",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Transform the data to match the expected format
    let categoriesWithSubs: any[];

    if (usingView) {
      // Using view data - subcategories already included as JSON
      categoriesWithSubs = categoriesData.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        icon_url: row.icon_url,
        subcategories: Array.isArray(row.subcategories)
          ? row.subcategories.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
          }))
          : [],
      }));
    } else {
      // Using separate queries - group subcategories by category_id
      const subsByCategory = new Map();
      subcategoriesData.forEach((sub: any) => {
        const catId = sub.category_id;
        if (!subsByCategory.has(catId)) {
          subsByCategory.set(catId, []);
        }
        subsByCategory.get(catId).push({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
        });
      });

      categoriesWithSubs = categoriesData.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon_url: cat.icon_url,
        subcategories: subsByCategory.get(cat.id) || [],
      }));
    }

    if (!categoriesWithSubs.length) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "X-Category-Source": "no-parents",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    return NextResponse.json(categoriesWithSubs, {
      status: 200,
      headers: {
        "X-Category-Source": "supabase-optimized",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
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
