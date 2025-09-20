// app/api/listings/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Query parameters (alle optioneel):
 * - q           : string (fulltext op title & description)
 * - category    : string (category slug)
 * - sub         : string (subcategory slug)
 * - page        : number (1-based)
 * - limit       : number (max 50, default 24)
 * - sort        : 'date_desc' | 'price_asc' | 'price_desc'
 */
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get("q") || "").trim();
  const catSlug = (searchParams.get("category") || "").trim();
  const subSlug = (searchParams.get("sub") || "").trim();

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "24")));
  const sort = (searchParams.get("sort") || "date_desc") as
    | "date_desc"
    | "price_asc"
    | "price_desc";

  // Basisquery: alleen actieve listings tonen
  let query = supabase
    .from("listings")
    .select("id,title,price,location,state,images,main_photo,created_at,categories,status", { count: "exact" })
    .eq("status", "active");

  // Zoeken
  if (q) {
    // ilike op title + description
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // Category / Subcategory via slug -> id
  let catId: number | null = null;
  let subId: number | null = null;

  if (catSlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id,slug")
      .eq("slug", catSlug)
      .maybeSingle();
    if (cat?.id) {
      catId = cat.id;
      // 'categories' kolom bevat array [categoryId, subcategoryId?]
      // We vragen om een lijstings-record waarvan de array de catId bevat
      query = query.contains("categories", [catId]);
    } else {
      return NextResponse.json({ items: [], page, limit, total: 0 });
    }
  }

  if (subSlug) {
    const { data: sub } = await supabase
      .from("subcategories")
      .select("id,slug")
      .eq("slug", subSlug)
      .maybeSingle();
    if (sub?.id) {
      subId = sub.id;
      // ook op subcategorie filteren
      query = query.contains("categories", [subId]);
    } else {
      return NextResponse.json({ items: [], page, limit, total: 0 });
    }
  }

  // Sortering
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  // Paginatie (range is zero-based)
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ items: [], page, limit, total: 0, error: error.message }, { status: 400 });
  }

  // Normaliseren naar front-end Listing type
  const items = (data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    location: l.location ?? undefined,
    state: l.state ?? undefined,
    main_photo: l.main_photo ?? (Array.isArray(l.images) && l.images.length ? l.images[0] : null),
    images: Array.isArray(l.images) ? l.images : [],
    created_at: l.created_at,
  }));

  return NextResponse.json({
    items,
    page,
    limit,
    total: count ?? 0,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
