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

  // Basisquery: alleen actieve listings tonen (niet verkocht)
  const wantCount = searchParams.get("count") !== "0";
  let query = supabase
    .from("listings")
    .select(
      "id,title,price,location,state,images,main_photo,created_at,categories,category_id,subcategory_id,status",
      { count: wantCount ? "exact" : undefined },
    )
    .eq("status", "actief")
    .neq("status", "verkocht"); // Expliciet verkochte items uitsluiten

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
      .neq("status", "verkocht") // Expliciet verkochte items uitsluiten
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
    id: string;
    title: string;
    price: number;
    location?: string | null;
    state?: string | null;
    images?: string[] | null;
    main_photo?: string | null;
    created_at: string | null;
  }
  const items = ((workingData as unknown) as ListingRow[] | null | undefined ?? []).map((
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
  
  // Extract correlation ID for tracking
  const requestId = request.headers.get('x-ocaso-request-id') || 'unknown';
  const startTime = Date.now();
  
  console.log(`[api/listings] REQUEST_START - request_id: ${requestId}, timestamp: ${new Date().toISOString()}`);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log(`[api/listings] AUTH_ERROR - request_id: ${requestId}, error: not_authenticated`);
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  console.log(`[api/listings] AUTH_SUCCESS - request_id: ${requestId}, user_id: ${user.id}`);

  // Check for idempotency - if this request_id already processed, return existing result
  if (requestId !== 'unknown') {
    console.log(`[api/listings] IDEMPOTENCY_CHECK - request_id: ${requestId}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRequest } = await (supabase.from("listing_create_requests" as never) as any)
      .select("*")
      .eq("request_id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'completed' && existingRequest.listing_id) {
        console.log(`[api/listings] IDEMPOTENCY_HIT - request_id: ${requestId}, existing_listing_id: ${existingRequest.listing_id}`);
        return NextResponse.json({ ok: true, id: existingRequest.listing_id }, { status: 201 });
      } else if (existingRequest.status === 'failed') {
        console.log(`[api/listings] IDEMPOTENCY_FAILED - request_id: ${requestId}, error: ${existingRequest.error_message}`);
        return NextResponse.json({ error: existingRequest.error_message || 'Previous request failed' }, { status: 400 });
      } else if (existingRequest.status === 'pending') {
        console.log(`[api/listings] IDEMPOTENCY_PENDING - request_id: ${requestId}`);
        return NextResponse.json({ error: 'Request already in progress' }, { status: 409 });
      }
    }

    // Create pending idempotency record
    console.log(`[api/listings] IDEMPOTENCY_CREATE - request_id: ${requestId}`);
    const { error: idempotencyError } = await supabase
      .from("listing_create_requests")
      .insert([{
        request_id: requestId,
        user_id: user.id,
        status: 'pending'
      }]);

    if (idempotencyError) {
      // If unique constraint fails, another request is already in progress
      if (idempotencyError.code === '23505') { // unique_violation
        console.log(`[api/listings] IDEMPOTENCY_RACE - request_id: ${requestId}`);
        return NextResponse.json({ error: 'Duplicate request detected' }, { status: 409 });
      }
      console.error(`[api/listings] IDEMPOTENCY_ERROR - request_id: ${requestId}:`, idempotencyError);
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
    console.log(`[api/listings] BODY_PARSED - request_id: ${requestId}, body_size: ${JSON.stringify(body).length}`);
  } catch (parseError) {
    console.log(`[api/listings] PARSE_ERROR - request_id: ${requestId}, error: ${parseError}`);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Server-side validation
  console.log(`[api/listings] STEP_2_VALIDATION - request_id: ${requestId}`);
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
    console.log(`[api/listings] VALIDATION_ERRORS - request_id: ${requestId}, errors: ${errors.join(', ')}`);
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  // Check if this is a vehicle category by getting category slug
  console.log(`[api/listings] STEP_3_CATEGORY_CHECK - request_id: ${requestId}, category_id: ${body.category_id}`);
  let isVehicleCategory = false;
  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", body.category_id as number)
    .maybeSingle();
  
  if (category?.slug && ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'].includes(category.slug)) {
    isVehicleCategory = true;
    console.log(`[api/listings] VEHICLE_CATEGORY_DETECTED - request_id: ${requestId}, slug: ${category.slug}`);
  } else {
    console.log(`[api/listings] NON_VEHICLE_CATEGORY - request_id: ${requestId}, slug: ${category?.slug || 'null'}`);
  }

  // Validate vehicle_details if provided and is vehicle category
  const vehicleDetails = body.vehicle_details as Record<string, unknown> | undefined;
  if (vehicleDetails && isVehicleCategory) {
    // Validate vehicle details fields (all optional but if provided must be valid)
    if (vehicleDetails.year && (typeof vehicleDetails.year !== 'number' || vehicleDetails.year < 1900 || vehicleDetails.year > 2030)) {
      errors.push("vehicle year must be between 1900 and 2030");
    }
    if (vehicleDetails.mileage_km && (typeof vehicleDetails.mileage_km !== 'number' || vehicleDetails.mileage_km < 0)) {
      errors.push("vehicle mileage_km must be non-negative");
    }
    if (vehicleDetails.power_hp && (typeof vehicleDetails.power_hp !== 'number' || vehicleDetails.power_hp <= 0 || vehicleDetails.power_hp > 2000)) {
      errors.push("vehicle power_hp must be between 1 and 2000");
    }
    
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }
  }

  // Prepare listing payload
  const payload = {
    seller_id: user.id,
    created_by: user.id,
    title: (body.title as string).trim(),
    description: body.description as string | null || null,
    price: body.price as number,
    images: body.images as string[],
    main_photo: (body.main_photo as string) || (body.images as string[])?.[0] || null,
    category_id: body.category_id as number,
    subcategory_id: body.subcategory_id as number | null || null,
    stock: body.stock as number,
    status: "actief",
    allowoffers: body.allow_offers as boolean || false,
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

  console.log(`[api/listings] STEP_4_LISTING_INSERT - request_id: ${requestId}, user_id: ${user.id}`);
  
  // Insert listing
  const { data, error } = await supabase
    .from("listings")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    console.error(`[api/listings] LISTING_INSERT_ERROR - request_id: ${requestId}, error:`, error);
    
    // Mark idempotency record as failed
    if (requestId !== 'unknown') {
      await supabase
        .from("listing_create_requests")
        .update({ 
          status: 'failed', 
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq("request_id", requestId)
        .eq("user_id", user.id);
    }
    
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const listingId = data.id;
  console.log(`[api/listings] LISTING_CREATED - request_id: ${requestId}, listing_id: ${listingId}`);

  // Insert vehicle details if provided and is vehicle category
  if (vehicleDetails && isVehicleCategory) {
    console.log(`[api/listings] STEP_5_VEHICLE_DETAILS - request_id: ${requestId}, listing_id: ${listingId}`);
    
    const vehiclePayload = {
      listing_id: listingId,
      year: vehicleDetails.year as number | null || null,
      mileage_km: vehicleDetails.mileage_km as number | null || null,
      body_type: vehicleDetails.body_type as string | null || null,
      condition: vehicleDetails.condition as string | null || null,
      fuel_type: vehicleDetails.fuel_type as string | null || null,
      power_hp: vehicleDetails.power_hp as number | null || null,
      transmission: vehicleDetails.transmission as string | null || null,
    };

    const { error: vehicleError } = await supabase
      .from("listing_vehicle_details")
      .insert([vehiclePayload]);

    if (vehicleError) {
      // If vehicle details insert fails, delete the listing to prevent partial success
      console.error(`[api/listings] VEHICLE_DETAILS_ERROR - request_id: ${requestId}, error:`, vehicleError);
      console.log(`[api/listings] ROLLBACK_LISTING - request_id: ${requestId}, listing_id: ${listingId}`);
      
      await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);
      
      // Mark idempotency record as failed
      if (requestId !== 'unknown') {
        await supabase
          .from("listing_create_requests")
          .update({ 
            status: 'failed', 
            error_message: "Failed to save vehicle details: " + vehicleError.message,
            updated_at: new Date().toISOString()
          })
          .eq("request_id", requestId)
          .eq("user_id", user.id);
      }
      
      return NextResponse.json({ 
        error: "Failed to save vehicle details: " + vehicleError.message 
      }, { status: 400 });
    }

    console.log(`[api/listings] VEHICLE_DETAILS_SUCCESS - request_id: ${requestId}, listing_id: ${listingId}`);
  }

  const duration = Date.now() - startTime;
  console.log(`[api/listings] REQUEST_COMPLETE - request_id: ${requestId}, listing_id: ${listingId}, duration: ${duration}ms`);

  // Mark idempotency record as completed
  if (requestId !== 'unknown') {
    await supabase
      .from("listing_create_requests")
      .update({ 
        status: 'completed', 
        listing_id: listingId,
        updated_at: new Date().toISOString()
      })
      .eq("request_id", requestId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true, id: listingId }, { status: 201 });
}
