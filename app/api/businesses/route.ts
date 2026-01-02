export const runtime = "nodejs";
// app/api/businesses/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
function like({ q }: { q: string }) {
  return `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
}
// Probeer waarde uit meerdere mogelijke kolommen te halen
type Profile = {
  id: string;
  company_name?: string;
  shop_name?: string;
  full_name?: string;
  categories?: string[];
  city?: string;
  address?: { city?: string };
  invoice_address?: { city?: string };
  rating?: number;
  avg_rating?: number;
  reviews?: number;
  review_count?: number;
  business_plan?: string;
  subscription_active?: boolean;
  is_business?: boolean;
};

function pick<T>(
  obj: Record<string, unknown>,
  ...keys: string[]
): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function mapProfileToBiz(p: Profile) {
  const name = pick<string>(p, "company_name", "shop_name", "full_name") ||
    "Onbekend";
  const shopName = pick<string>(p, "shop_name", "company_name", "full_name") ||
    name;
  const categories = Array.isArray(p.categories) ? p.categories : [];
  const city = pick<string>(p, "city") ||
    pick<string>(p.address ?? {}, "city") ||
    pick<string>(p.invoice_address ?? {}, "city") ||
    "";
  const rating = Number(p.rating ?? p.avg_rating ?? 0);
  const reviews = Number(p.reviews ?? p.review_count ?? 0);
  const plan = String(p.business_plan || "").toLowerCase();
  const subscriptionActive = plan === "pro" || plan === "premium" ||
    !!p.subscription_active;
  const logoUrl =
    (p as unknown as { business_logo_url?: string; avatar_url?: string })
      .business_logo_url ||
    (p as unknown as { avatar_url?: string }).avatar_url || null;

  return {
    id: p.id,
    name,
    shopName,
    categories,
    city,
    rating,
    reviews,
    subscriptionActive,
    logoUrl,
    // raw fields for fallback
    company_name: p.company_name ?? null,
    shop_name: p.shop_name ?? null,
    full_name: p.full_name ?? null,
  };
}

export async function GET(req: Request) {
  try {
    // Parse query params
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const mode = searchParams.get("mode") ?? "business";
    const cat = searchParams.get("cat") ?? "";
    const subcat = searchParams.get("subcat") ?? "";
    const city = searchParams.get("city") ?? "";
    const minRating = Number(searchParams.get("minRating") ?? 0);
    const sort = searchParams.get("sort") || "relevance"; // rating_desc | reviews_desc | name_asc

    // Use supabaseServer (imported above)
    const supabase = supabaseServer();

    // Fetch all potential business profiles (broad fetch then refine)
    const { data: allBiz, error: allBizErr } = await supabase
      .from("profiles")
      .select("*")
      .or("is_business.eq.true,business_plan.neq.null");

    if (allBizErr) {
      console.error("[/api/businesses] allBiz error:", allBizErr);
      return NextResponse.json(
        { error: allBizErr.message, businesses: [], cats: [], cities: [] },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Only keep definite business profiles (flag or active plan)
    const safeAll: Profile[] = ((allBiz ?? []) as Profile[]).filter((p) =>
      p.is_business ||
      (p.business_plan && String(p.business_plan).trim() !== "")
    );

    const allCats = uniq(
      safeAll.flatMap((p: Profile) =>
        Array.isArray(p.categories) ? p.categories : []
      ),
    ).sort((a: string, b: string) => String(a).localeCompare(String(b)));

    const allCities = uniq(
      safeAll
        .map(
          (p: Profile) =>
            p.city || p.address?.city || p.invoice_address?.city || null,
        )
        .filter(Boolean) as string[],
    ).sort((a: string, b: string) => a.localeCompare(b));

    // 2) Zoekresultaten
    let resultProfiles: Profile[] = [];

    if (mode === "product") {
      // a) optioneel: match sellers via listings.title
      let sellerIds: string[] = [];
      if (q) {
        const { data: listHits, error: listErr } = await supabase
          .from("listings")
          .select("seller_id")
          .ilike("title", like({ q }))
          .eq("status", "actief");
        // .neq("status","draft")  // ❌ laat weg als kolom mogelijk niet bestaat

        if (listErr) {
          console.error("[/api/businesses] listings error:", listErr);
        } else {
          sellerIds = uniq(
            (listHits || []).map((r: { seller_id: string }) => r.seller_id)
              .filter(Boolean),
          );
        }
      }

      let prof = supabase
        .from("profiles")
        .select("*")
        .or("is_business.eq.true,business_plan.neq.null");
      if (q) {
        if (sellerIds.length === 0) {
          resultProfiles = [];
        } else {
          prof = prof.in("id", sellerIds);
          const { data, error } = await prof;
          if (error) {
            console.error("[/api/businesses] product profiles error:", error);
            resultProfiles = [];
          } else {
            resultProfiles = (data as unknown) as Profile[] || [];
          }
        }
      } else {
        const { data, error } = await prof;
        if (error) {
          console.error("[/api/businesses] product all profiles error:", error);
          resultProfiles = [];
        } else {
          resultProfiles = data || [];
        }
      }
    } else {
      // MODE BUSINESS — OR-zoekopdracht op company_name | shop_name
      let prof = supabase
        .from("profiles")
        .select("*")
        .or("is_business.eq.true,business_plan.neq.null");

      if (q) {
        prof = prof.or(
          `company_name.ilike.${like({ q })},shop_name.ilike.${like({ q })}`,
        );
      }

      const { data, error } = await prof;
      if (error) {
        console.error("[/api/businesses] business profiles error:", error);
        resultProfiles = [];
      } else {
        resultProfiles = data || [];
      }
    }

    // 3) Filters toepassen (best-effort)
    if (cat) {
      // Probeer cat te matchen op parent én zijn subcategorieën (name of slug)
      const allowedNames = new Set<string>();
      try {
        // Relationele poging: haal parent + subcategories op (match op name)
        interface CategoryWithSubs {
          id: number;
          name: string;
          subcategories?: Array<{ name?: string | null }> | null;
        }
        const rel = await supabase
          .from("categories")
          .select("id,name,subcategories(name)")
          .eq("name", cat)
          .limit(1)
          .maybeSingle();
        const relData = rel.data as CategoryWithSubs | null;
        if (relData) {
          allowedNames.add(relData.name);
          if (Array.isArray(relData.subcategories)) {
            for (
              const s of relData.subcategories as { name?: string | null }[]
            ) {
              if (s?.name) allowedNames.add(s.name);
            }
          }
        } else {
          // Fallback: flat structuur met parent_id
          interface CategoryRow {
            id: number;
            name: string;
          }
          const parent = await supabase
            .from("categories")
            .select("id,name")
            .eq("name", cat)
            .limit(1)
            .maybeSingle();
          const parentData = parent.data as CategoryRow | null;
          if (parentData) {
            allowedNames.add(parentData.name);
            interface CategoryNameRow {
              name?: string | null;
            }
            const kids = await supabase
              .from("categories")
              .select("name")
              .eq("parent_id", parentData.id);
            const kidsData = kids.data as CategoryNameRow[] | null;
            if (kidsData) {
              for (const r of kidsData) {
                if (r?.name) allowedNames.add(r.name);
              }
            }
          }
        }
      } catch (e) {
        // ignore and fallback below
      }
      if (allowedNames.size === 0) allowedNames.add(cat);
      resultProfiles = resultProfiles.filter((p) => {
        const arr = Array.isArray(p.categories) ? p.categories : [];
        return arr.some((x) => allowedNames.has(x));
      });
    }
    if (subcat) {
      resultProfiles = resultProfiles.filter((p) =>
        Array.isArray(p.categories) ? p.categories.includes(subcat) : false
      );
    }
    if (city) {
      resultProfiles = resultProfiles.filter((p) => {
        const c = p.city ||
          p.address?.city ||
          p.invoice_address?.city ||
          "";
        return c === city;
      });
    }
    if (minRating > 0) {
      // Eerste ruwe filter op bestaande kolom
      const prelimBase = resultProfiles.filter(
        (p) => Number(p.rating ?? p.avg_rating ?? 0) >= minRating,
      );
      const prelimExtra: typeof resultProfiles = [];
      const prelimIds = new Set(prelimBase.map((p) => p.id));
      // Kandidaten met (nog) geen opgeslagen rating maar mogelijk wel reviews
      const fallbackCandidates = resultProfiles.filter((p) =>
        !prelimIds.has(p.id)
      );
      if (fallbackCandidates.length) {
        try {
          const candidateIds = fallbackCandidates.map((p) => p.id);
          // Haal gemiddelde uit reviews voor deze kandidaten in 1 query
          const { data: agg, error: aggErr } = await supabase
            .from("reviews")
            .select("business_id, rating")
            .in("business_id", candidateIds)
            .not("business_id", "is", null);
          if (!aggErr && Array.isArray(agg)) {
            // Bereken averages client-side (we hebben toch alle ratings teruggekregen)
            const map: Record<string, { sum: number; count: number }> = {};
            for (
              const row of agg as {
                business_id?: string | null;
                rating?: number | null;
              }[]
            ) {
              if (!row.business_id) continue;
              if (!map[row.business_id]) {
                map[row.business_id] = { sum: 0, count: 0 };
              }
              map[row.business_id].sum += Number(row.rating || 0);
              map[row.business_id].count += 1;
            }
            // Voeg businessen toe die op basis van fallback gemiddelde voldoen
            for (const p of fallbackCandidates) {
              const m = map[p.id];
              if (m && m.count > 0) {
                const avg = m.sum / m.count;
                if (avg >= minRating) prelimExtra.push({ ...p, rating: avg });
              }
            }
          }
        } catch (e) {
          console.warn("[businesses] fallback rating aggregatie fout", e);
        }
      }
      resultProfiles = [...prelimBase, ...prelimExtra];
    }

    // 4) Bereken actuele ratings en splits uitkomst afhankelijk van modus
    try {
      if (resultProfiles.length) {
        const ids = resultProfiles.map((p) => p.id);
        const { data: rawRatings, error: rawErr } = await supabase
          .from("reviews")
          .select("business_id,rating")
          .in("business_id", ids)
          .not("business_id", "is", null);
        if (!rawErr && Array.isArray(rawRatings)) {
          const agg: Record<string, { sum: number; count: number }> = {};
          for (
            const r of rawRatings as {
              business_id?: string | null;
              rating?: number | null;
            }[]
          ) {
            if (!r.business_id) continue;
            if (!agg[r.business_id]) agg[r.business_id] = { sum: 0, count: 0 };
            agg[r.business_id].sum += Number(r.rating || 0);
            agg[r.business_id].count += 1;
          }
          interface MutableProfile extends Profile {
            rating?: number;
            reviews?: number;
            review_count?: number;
            avg_rating?: number;
          }
          for (const p of resultProfiles as MutableProfile[]) {
            const a = agg[p.id];
            if (a && a.count > 0) {
              p.rating = a.sum / a.count;
              p.reviews = a.count;
              p.review_count = a.count;
              p.avg_rating = a.sum / a.count;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[businesses] rating aggregatie mislukt", e);
    }

    if (mode === "product") {
      // Haal producten op van gefilterde zakelijke verkopers
      const sellerIds = resultProfiles.map((p) => p.id);
      let list = supabase
        .from("listings")
        .select("id,title,price,images,main_photo,status,seller_id,created_at")
        .in("seller_id", sellerIds)
        .eq("status", "actief")
        .order("created_at", { ascending: false })
        .limit(48);
      if (q) {
        list = list.ilike("title", like({ q }));
      }
      const { data: productsRaw, error: listErr } = await list;
      if (listErr) {
        console.error("[businesses] products listings error", listErr);
      }
      const byId = new Map<string, Profile>(
        resultProfiles.map((p) => [p.id, p]),
      );
      type ProductRow = {
        id: string;
        title: string;
        price?: number | null;
        images?: string[] | null;
        main_photo?: string | null;
        status?: string | null;
        seller_id: string;
        created_at?: string;
      };
      const products = ((productsRaw || []) as ProductRow[]).map((r) => {
        const prof = byId.get(r.seller_id);
        const name = prof
          ? (pick<string>(
            prof as unknown as Record<string, unknown>,
            "shop_name",
            "company_name",
            "full_name",
          ) || "Onbekend")
          : "Onbekend";
        const city = prof
          ? (
            pick<string>(prof as unknown as Record<string, unknown>, "city") ||
            pick<string>(
              (prof.address ?? {}) as unknown as Record<string, unknown>,
              "city",
            ) ||
            pick<string>(
              (prof.invoice_address ?? {}) as unknown as Record<
                string,
                unknown
              >,
              "city",
            ) ||
            ""
          )
          : "";
        return {
          id: r.id,
          title: r.title,
          price: r.price ?? null,
          imageUrl: r.main_photo ??
            (Array.isArray(r.images) && r.images.length ? r.images[0] : null),
          status: r.status,
          sellerId: r.seller_id,
          sellerName: name,
          sellerCity: city,
        };
      });
      return NextResponse.json(
        { businesses: [], products, cats: allCats, cities: allCities },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // MODE BUSINESS: Map naar compact frontend type (zonder listings)
    const businesses = resultProfiles.map((profile) => {
      return mapProfileToBiz(profile);
    });

    // 5) Sorteren
    const sorted = [...businesses];
    if (sort === "rating_desc") {
      sorted.sort((a, b) => (b.rating - a.rating) || (b.reviews - a.reviews));
    } else if (sort === "reviews_desc") {
      sorted.sort((a, b) => (b.reviews - a.reviews) || (b.rating - a.rating));
    } else if (sort === "name_asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json(
      { businesses: sorted, cats: allCats, cities: allCities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    console.error("[/api/businesses] unexpected:", err);
    let errorMessage = "Server error";
    if (
      typeof err === "object" && err !== null && "message" in err &&
      typeof (err as { message?: string }).message === "string"
    ) {
      errorMessage = (err as { message: string }).message;
    }
    return NextResponse.json(
      { error: errorMessage, businesses: [], cats: [], cities: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
