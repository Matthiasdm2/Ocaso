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

export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Server-side validation
  const errors: string[] = [];
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push("title is required");
  }
  if (!body.price || typeof body.price !== 'number' || body.price <= 0) {
    errors.push("price must be a positive number");
  }
  if (!body.category_id || typeof body.category_id !== 'number') {
    errors.push("category_id is required");
  }
  if (!Array.isArray(body.images) || body.images.length < 1) {
    errors.push("at least one image is required");
  }
  if (!body.stock || typeof body.stock !== 'number' || body.stock < 1) {
    errors.push("stock must be at least 1");
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  // Prepare payload
  const payload = {
    seller_id: user.id,
    created_by: user.id,
    title: (body.title as string).trim(),
    description: body.description as string | null || null,
    price: body.price as number,
    images: body.images as string[],
    main_photo: (body.main_photo as string) || (body.images as string[])[0],
    category_id: body.category_id as number,
    subcategory_id: body.subcategory_id as number | null || null,
    stock: body.stock as number,
    status: "actief",
    allow_offers: body.allow_offers as boolean || false,
    state: body.state as string || "nieuw",
    location: body.location as string | null || null,
    allow_shipping: body.allow_shipping as boolean || false,
    shipping_length: body.shipping_length as number | null || null,
    shipping_width: body.shipping_width as number | null || null,
    shipping_height: body.shipping_height as number | null || null,
    shipping_weight: body.shipping_weight as number | null || null,
    min_bid: body.min_bid as number | null || null,
    secure_pay: body.secure_pay as boolean || false,
    promo_featured: false,
    promo_top: false,
  };

  console.log('Creating listing for user', user.id, 'with payload:', { ...payload, images: payload.images?.length });

  const { data, error } = await supabase
    .from("listings")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    console.error('Listing create error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log('Listing created successfully, id:', data.id);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
