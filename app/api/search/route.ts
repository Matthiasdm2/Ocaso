// app/api/search/route.ts
import { NextResponse } from "next/server";

import { CATEGORIES } from "@/lib/categories";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);

  const qRaw = (searchParams.get("q") || "").trim();
  const normalize = (s: string) => s.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  const qLower = normalize(qRaw);
  const q = qRaw;
  const catId = (searchParams.get("catId") || "").trim();
  const subId = (searchParams.get("subId") || "").trim();

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "24")));

  const priceMin = Number(searchParams.get("priceMin") || "0");
  const priceMax = Number(searchParams.get("priceMax") || "0");
  const state = (searchParams.get("state") || "").trim();
  const location = (searchParams.get("location") || "").trim();
  const sortRaw = searchParams.get("sort") || "date_desc";
  const sort = sortRaw as "relevance" | "date_desc" | "date_asc" | "price_asc" | "price_desc";
  const businessParam = searchParams.get("business"); // '0' betekent zakelijke uitsluiten, anders tonen
  const businessOnly = searchParams.get("businessOnly") === '1'; // Alleen zakelijke resultaten (voor suggesties onderaan)
  const debug = searchParams.get("debug") === '1';
  const showAll = searchParams.get("showAll") === '1';
  const mode = searchParams.get("mode") || 'normal';
  const diag = searchParams.get("diag") === '1';
  // Eenvoudige modus: negeer alle heuristieken en geef laatste listings terug met optionele q filter
  if (mode === 'simple') {
    let base = supabase
      .from('listings')
      .select('id,title,price,location,state,images,main_photo,created_at,status,isBusinessSeller', { count: 'exact' });
    if (!showAll) base = base.eq('status','active');
    if (qLower) {
      base = base.or(`title.ilike.%${qLower}%,description.ilike.%${qLower}%`);
    }
    base = base.order('created_at', { ascending: false }).range(0, limit - 1);
    const { data, error, count } = await base;
    if (error) {
      return NextResponse.json({ items: [], page:1, limit, total:0, error: error.message }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const items = (data ?? []).map(l => ({
      id: l.id,
      title: l.title,
      price: l.price,
      location: l.location ?? undefined,
      state: l.state ?? undefined,
      main_photo: l.main_photo ?? (Array.isArray(l.images)&&l.images.length? l.images[0]: null),
      images: Array.isArray(l.images)? l.images: [],
      created_at: l.created_at,
      isBusinessSeller: l.isBusinessSeller ?? null,
    }));
    if (diag) {
      // haal totaal zonder filters + sample
      const totalAllQ = await supabase.from('listings').select('id', { count: 'exact', head: true });
      const sampleQ = await supabase.from('listings').select('id,title,status,created_at').limit(3);
      return NextResponse.json({ items, page:1, limit, total: count ?? 0, mode: 'simple', diag: {
        q: qLower, showAll, totalAll: totalAllQ.count ?? null, sample: sampleQ.data ?? [],
      } }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ items, page:1, limit, total: count ?? 0, mode: 'simple' }, { headers: { 'Cache-Control': 'no-store' } });
  }

  let query = supabase
    .from("listings")
    .select("id,title,price,location,state,images,main_photo,created_at,categories,status,isBusinessSeller", { count: "exact" });
  if (!showAll) {
    query = query.eq("status", "active");
  }

  // Heuristische categoriedetectie alleen indien expliciet aangevraagd (?heuristics=1)
  const heuristicsEnabled = searchParams.get("heuristics") === '1';
  const matchedCategoryIds: number[] = [];
  let categoryFiltered = false;
  if (heuristicsEnabled && qLower) {
    const fietsTerms = ["fiets", "fietsen", "racefiets", "racefietsen", "mountainbike", "mtb", "e-bike", "ebike", "elektrische fiets", "elektrische fietsen"];
    const isFiets = fietsTerms.some(t => qLower.includes(t));
    if (isFiets) {
      const catIdx = CATEGORIES.findIndex(c => c.name.startsWith("Fietsen"));
      if (catIdx !== -1) matchedCategoryIds.push(catIdx + 1);
      const sportIdx = CATEGORIES.findIndex(c => c.name.startsWith("Sport"));
      if (sportIdx !== -1) matchedCategoryIds.push(sportIdx + 1);
    }
    if (matchedCategoryIds.length > 0) {
      const primaryId = matchedCategoryIds[0];
      query = query.contains("categories", [primaryId]);
      categoryFiltered = true;
    }
  }

  // Helper om OR filter string op te bouwen op basis van synoniemen/varianten
  const buildOrFilter = (term: string) => {
    const tNorm = term.toLowerCase();
    const terms = new Set<string>();
    terms.add(tNorm);
    tNorm.split(" ").forEach(t => t && terms.add(t));
    const bicycleSynonyms: Record<string, string[]> = {
      racefiets: ["racefiets", "racefietsen", "koersfiets", "koersfietsen", "road bike", "roadbike"],
      koersfiets: ["koersfiets", "koersfietsen", "racefiets", "racefietsen"],
      mountainbike: ["mountainbike", "mountainbikes", "mtb"],
      mtb: ["mtb", "mountainbike", "mountainbikes"],
      e: ["e-bike", "ebike", "e bike", "elektrische fiets", "elektrische fietsen", "e-bike", "e-bikes"],
      fiets: ["fiets", "fietsen"],
    };
    Object.entries(bicycleSynonyms).forEach(([key, arr]) => {
      if (tNorm.includes(key)) arr.forEach(a => terms.add(a));
    });
    const termList = Array.from(terms).filter(x => x.length > 1).slice(0, 14);
    if (!termList.length) return undefined;
    const orParts: string[] = [];
    termList.forEach(t => {
      const esc = t.replace(/%/g, "");
      orParts.push(`title.ilike.%${esc}%`);
      orParts.push(`description.ilike.%${esc}%`);
    });
    return orParts.join(',');
  };

  // --- Synoniemen & uitbreidingen voor gerichtere matches ---
  if (q && !categoryFiltered) {
    const orString = buildOrFilter(qLower);
    if (orString) query = query.or(orString);
  }
  if (catId) query = query.contains("categories", [Number(catId)]);
  if (subId) query = query.contains("categories", [Number(subId)]);
  if (priceMin > 0) query = query.gte("price", priceMin);
  if (priceMax > 0) query = query.lte("price", priceMax);
  if (state) query = query.eq("state", state);
  if (location) query = query.ilike("location", `%${location}%`);
  if (businessOnly) {
    query = query.eq('isBusinessSeller', true);
  } else if (businessParam === '0') {
    // verberg zakelijke
    query = query.neq('isBusinessSeller', true);
  }

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "date_asc") query = query.order("created_at", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const result = await query;
  let { data } = result;
  const { error } = result;
  let { count } = result;

  // Fallback: als pure categorie filter geen resultaten geeft, alsnog tekst-based query
  if (!error && categoryFiltered && (data?.length ?? 0) === 0 && qLower) {
    // Breder fallback met synoniem OR keten
    const orString = buildOrFilter(qLower) || `title.ilike.%${qLower}%,description.ilike.%${qLower}%`;
    const fbQuery = supabase
      .from("listings")
      .select("id,title,price,location,state,images,main_photo,created_at,categories,status,isBusinessSeller", { count: "exact" })
      .eq("status", "active")
      .or(orString)
      .range(0, limit - 1);
    const fb = await fbQuery;
    if (!fb.error) {
      data = fb.data;
      count = fb.count;
    }
  }

  // Tweede, bredere fallback: als nog steeds geen resultaten en er is een q, doe een zeer brede OR zonder categorie/business beperkingen
  let emptyReason: string | undefined;
  if (!error && (data?.length ?? 0) === 0 && qLower) {
    const broadOr = `title.ilike.%${qLower}%,description.ilike.%${qLower}%`;
    // Zonder status filter nu
    const broadQ = supabase
      .from("listings")
      .select("id,title,price,location,state,images,main_photo,created_at,categories,status,isBusinessSeller", { count: "exact" })
      .or(broadOr);
    if (!showAll) broadQ.eq("status", "active");
    const broad = await broadQ.range(0, limit - 1);
    if (!broad.error && (broad.data?.length ?? 0) > 0) {
      data = broad.data;
      count = broad.count;
      emptyReason = "broad-fallback-hit";
    } else if (!broad.error && (broad.data?.length ?? 0) === 0) {
      emptyReason = "no-results-broad";
    }
  }

  // Ultra fallback: als nog steeds leeg en geen fout, pak simpelweg de nieuwste listings (zonder filters) zodat de gebruiker altijd iets ziet
  if (!error && (data?.length ?? 0) === 0) {
    const any = await supabase
      .from("listings")
      .select("id,title,price,location,state,images,main_photo,created_at,categories,status,isBusinessSeller", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, limit - 1);
    if (!any.error && (any.data?.length ?? 0) > 0) {
      data = any.data;
      count = any.count;
      if (!emptyReason) emptyReason = "ultra-fallback-any";
    }
  }

  if (error) {
    return NextResponse.json(
      { items: [], page, limit, total: 0, error: error.message },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  interface Row { id: string; title?: string; price?: number; location?: string | null; state?: string | null; images?: string[] | null; main_photo?: string | null; created_at?: string | null; isBusinessSeller?: boolean | null; }
  const items = (data as Row[] | null ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    location: l.location ?? undefined,
    state: l.state ?? undefined,
    main_photo: l.main_photo ?? (Array.isArray(l.images) && l.images.length ? l.images[0] : null),
    images: Array.isArray(l.images) ? l.images : [],
    created_at: l.created_at,
    isBusinessSeller: l.isBusinessSeller ?? null,
  }));

  interface SearchItem { id: string; title?: string; price?: number; location?: string; state?: string; main_photo: string | null; images: string[]; created_at?: string | null; isBusinessSeller: boolean | null; }
  interface SearchResponsePayload { items: SearchItem[]; page: number; limit: number; total: number; debug?: Record<string, unknown>; }
  const payload: SearchResponsePayload = { items: items as SearchItem[], page, limit, total: count ?? 0 };
  if (debug) {
    payload.debug = {
      q: qRaw,
      normalized: qLower,
      matchedCategoryIds,
      categoryFiltered,
      sort: sortRaw,
      businessOnly,
      businessParam,
      from,
      to,
      received: data?.length || 0,
  emptyReason: emptyReason || ((data?.length || 0) === 0 ? 'no-results' : undefined),
  diag: diag || undefined,
    };
  }

  return NextResponse.json(
    payload,
    { headers: { "Cache-Control": "no-store" } },
  );
}

