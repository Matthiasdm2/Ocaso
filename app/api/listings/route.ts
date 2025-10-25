export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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
  const started = Date.now();
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get("q") || "").trim();
  const catSlug = (searchParams.get("category") || "").trim();
  const subSlug = (searchParams.get("sub") || "").trim();

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") || "24")),
  );
  const sort = (searchParams.get("sort") || "date_desc") as
    | "date_desc"
    | "price_asc"
    | "price_desc";

  // Basisquery: alleen actieve listings tonen
  const wantCount = searchParams.get("count") !== "0";
  let query = supabase
    .from("listings")
    .select(
      "id,title,price,location,state,images,main_photo,created_at,categories,category_id,subcategory_id,status",
      { count: wantCount ? "exact" : undefined },
    )
    .eq("status", "actief");

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
      // Check both category_id field and categories array for backward compatibility
      query = query.or(`category_id.eq.${catId},categories.cs.{${catId}}`);
    } else {
      return NextResponse.json({ items: [], page, limit, total: 0 });
    }
  }

  if (subSlug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase as any)
      .from("subcategories")
      .select("id,slug")
      .eq("slug", subSlug)
      .maybeSingle();
    if (sub?.id) {
      subId = sub.id;
      // Check both subcategory_id field and categories array for backward compatibility
      query = query.or(`subcategory_id.eq.${subId},categories.cs.{${subId}}`);
    } else {
      return NextResponse.json({ items: [], page, limit, total: 0 });
    }
  }

  // Sortering
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else query = query.order("created_at", { ascending: false });

  // Paginatie (range is zero-based)
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({
      items: [],
      page,
      limit,
      total: 0,
      error: error.message,
    }, { status: 400 });
  }

  let workingData = data ?? [];
  let workingCount = count ?? 0;

  // Fallback: als q gezet is maar niets gevonden, probeer zonder q zodat gebruiker toch iets ziet
  if ((workingData.length === 0) && q) {
    // Minimal fallback maar zonder extra count (sneller)
    const fbQuery = supabase
      .from("listings")
      .select(
        "id,title,price,location,state,images,main_photo,created_at,categories,category_id,subcategory_id,status",
      )
      .eq("status", "actief")
      .order("created_at", { ascending: false })
      .range(from, to);
    const { data: fbData } = await fbQuery;
    if (fbData && fbData.length > 0) {
      workingData = fbData;
      if (wantCount && workingCount === 0) workingCount = fbData.length; // best effort
    }
  }

  // Normaliseren naar front-end Listing type
  interface ListingRow {
    id: number;
    title: string;
    price: number;
    location?: string | null;
    state?: string | null;
    images?: string[] | null;
    main_photo?: string | null;
    created_at: string;
  }
  const items = (workingData as ListingRow[] | null | undefined ?? []).map((
    l: ListingRow,
  ) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    location: l.location ?? undefined,
    state: l.state ?? undefined,
    main_photo: l.main_photo ??
      (Array.isArray(l.images) && l.images.length ? l.images[0] : null),
    images: Array.isArray(l.images) ? l.images : [],
    created_at: l.created_at,
  }));

  const durationMs = Date.now() - started;
  return NextResponse.json({
    items,
    page,
    limit,
    total: wantCount ? workingCount : undefined,
    meta: { durationMs, counted: wantCount },
  }, {
    headers: {
      "Cache-Control": "no-store",
      "X-Query-Time": String(durationMs),
    },
  });
}
