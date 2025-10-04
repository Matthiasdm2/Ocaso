// app/api/profile/listings/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Ensure this route is always dynamic (uses cookies/auth)
export const dynamic = 'force-dynamic';

function mapStatus(dbStatus: string | null | undefined): string {
  const mapping: Record<string, string> = {
    "actief": "active",
    "gepauzeerd": "paused", 
    "verkocht": "sold",
    "draft": "draft"
  };
  return mapping[dbStatus || ""] || "active";
}

interface ListingRow {
  id: string;
  title: string | null;
  description: string | null;
  price: number | string | null;
  stock?: number | null;
  images: string[] | null;
  main_photo: string | null;
  created_at: string | null;
  views: number | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  categories?: number[] | null; // legacy array, maybe still populated
  state?: string | null;
  location?: string | null;
  allowoffers?: boolean | null;
  status?: string | null;
}


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "20")),
  );
  // const offset = (page - 1) * limit;

  // Supabase client met cookies (zodat auth werkt)
  let supabase = createRouteHandlerClient({ cookies });

  // 1) seller_id uit query gebruiken (client stuurt deze mee)
  //    zo niet aanwezig: terugvallen op ingelogde user
  let sellerId = searchParams.get("seller_id") ?? undefined;
  // Probeer user af te leiden uit cookies; als dat faalt, val terug op Bearer token
  let { data: { user } } = await supabase.auth.getUser();
  if (!sellerId) sellerId = user?.id;
  if (!sellerId || !user) {
    const auth = req.headers.get('authorization');
    const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
    if (token) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const alt = createClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const got = await alt.auth.getUser();
        if (got.data.user) {
          supabase = alt as unknown as typeof supabase; // switch naar bearer-gebonden client
          user = got.data.user;
          if (!sellerId) sellerId = got.data.user.id;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!sellerId) {
    // Geen id bekend → leeg resultaat i.p.v. error
    return NextResponse.json(
      { items: [], page, limit, total: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Try selecting with stock; if the column doesn't exist in this environment, retry without it.
  let noStockColumn = false;
  let data: ListingRow[] | null = null;
  let count: number | null = null;
  {
    const first = await supabase
      .from("listings")
      .select("id,title,description,price,stock,images,main_photo,created_at,views,category_id,subcategory_id,categories,state,location,allowoffers,status", { count: "exact" })
      .eq("seller_id", sellerId);
    const msg = first.error?.message || "";
    const unknownColumn = /column|does not exist|unknown|invalid reference/i.test(msg);
    if (first.error && (/stock/i.test(msg) || /allowoffers/i.test(msg) || unknownColumn)) {
      // Fallback: relax columns; omit stock and allowoffers to be safe across envs
      noStockColumn = /stock/i.test(msg);
      const fallback = await supabase
        .from("listings")
        .select("id,title,description,price,images,main_photo,created_at,views,category_id,subcategory_id,categories,state,location,status", { count: "exact" })
        .eq("seller_id", sellerId);
      data = (fallback.data as unknown as ListingRow[]) ?? [];
      count = fallback.count ?? 0;
    } else {
      data = (first.data as unknown as ListingRow[]) ?? [];
      count = first.count ?? 0;
      if (first.error) {
        return NextResponse.json(
          { items: [], page, limit, total: 0, error: first.error.message },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }
  }

  // Verzamel unieke categorie & subcategorie ids
  const catIds = new Set<number>();
  const subIds = new Set<number>();
  for (const l of (data as ListingRow[] | null) ?? []) {
    // Attempt derive subcategory from legacy categories array if missing
    let derivedSubId: number | null = null;
    if ((!l.subcategory_id || typeof l.subcategory_id !== 'number') && Array.isArray(l.categories) && l.categories.length > 1) {
      // Heuristic: largest id that isn't the category_id OR the second element
      // Prefer the last element if distinct from category_id
      const unique = l.categories.filter(x => x && x !== l.category_id);
      if (unique.length > 0) derivedSubId = unique[unique.length - 1];
    }
    if (typeof l.category_id === 'number') catIds.add(l.category_id);
    if (typeof l.subcategory_id === 'number') subIds.add(l.subcategory_id);
    if (derivedSubId) subIds.add(derivedSubId);
    // Also add IDs from categories array
    if (Array.isArray(l.categories)) {
      l.categories.forEach(id => {
        if (typeof id === 'number') {
          if (l.categories!.indexOf(id) === 0) catIds.add(id); // first is category
          else subIds.add(id); // others are subcategories
        }
      });
    }
  }

  // Query category namen in één keer (inclusief subcategorieën uit dezelfde tabel)
  const allIds = Array.from(new Set([...catIds, ...subIds]));
  const nameMap: Record<number, string> = {};
  if (allIds.length > 0) {
    // Haal hoofdcategorieën op
    const { data: catsData } = await supabase
      .from("categories")
      .select("id,name")
      .in("id", allIds);
    for (const c of catsData ?? []) {
      nameMap[c.id as number] = c.name as string;
    }

    // Haal subcategorieën op
    const { data: subCatsData } = await supabase
      .from("subcategories")
      .select("id,name")
      .in("id", allIds);
    for (const c of subCatsData ?? []) {
      nameMap[c.id as number] = c.name as string;
    }
  }

  // Haal biedingen per listing op en verrijk met categorie namen
  const items = [];
  for (const l of (data as ListingRow[] | null) ?? []) {
    // Query biedingen voor deze listing
    const { data: bidsData } = await supabase
      .from("bids")
      .select("amount")
      .eq("listing_id", l.id);

    const bids = bidsData ? bidsData.length : 0;
    const highest_bid = bidsData && bidsData.length > 0
      ? Math.max(...bidsData.map(b => b.amount))
      : null;

  const category_id = l.category_id ?? null;
    let subcategory_id = l.subcategory_id ?? null;
    if (!subcategory_id && Array.isArray(l.categories) && l.categories.length > 1) {
      const unique = l.categories.filter(x => x && x !== category_id);
      if (unique.length > 0) subcategory_id = unique[unique.length - 1];
    }
    items.push({
      id: l.id,
      title: l.title ?? "",
      description: l.description ?? "",
      price: Number(l.price ?? 0),
      stock: noStockColumn ? null : (typeof (l as { stock?: number | null }).stock === 'number' ? (l as { stock?: number | null }).stock! : null),
      imageUrl: l.main_photo ?? (Array.isArray(l.images) && l.images[0] ? l.images[0] : null),
      images: l.images ?? [],
      main_photo: l.main_photo ?? null,
      created_at: l.created_at,
      bids,
      highest_bid,
      views: typeof l.views === 'number' ? l.views : 0,
      category: category_id ? nameMap[category_id] ?? null : (Array.isArray(l.categories) && l.categories.length > 0 ? nameMap[l.categories[0]] ?? null : null),
      subcategory: subcategory_id ? nameMap[subcategory_id] ?? null : (Array.isArray(l.categories) && l.categories.length > 1 ? nameMap[l.categories[1]] ?? null : null),
      condition: l.state ?? null,
      location: l.location ?? null,
      allow_offers: l.allowoffers ?? false,
      status: mapStatus(l.status),
    });
  }

  return NextResponse.json(
    {
      items,
      page,
      limit,
      total: count ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
