import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v as string;
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { id } = params;

  console.log(`[API /business/[id]] Opgevraagd ID:`, id);

  // Haal bedrijfsprofiel op
  const { data: business, error: bizErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("is_business", true)
    .maybeSingle();

  if (bizErr) {
    console.error(`[API /business/[id]] Supabase error:`, bizErr);
  }
  if (!business) {
    console.warn(`[API /business/[id]] Geen bedrijf gevonden voor ID:`, id);
  } else {
    console.log(`[API /business/[id]] Bedrijf gevonden:`, business);
  }

  if (bizErr || !business) {
    return NextResponse.json({ error: "Bedrijf niet gevonden" }, { status: 404 });
  }

  // Haal listings van dit bedrijf op
  // Zoek op seller_id OF organization_id
  const { data: listings, error: listingsErr } = await supabase
    .from("listings")
    .select("*,bids(count),views(count)")
    .or(`seller_id.eq.${id},organization_id.eq.${id}`);
  if (listingsErr) {
    console.error(`[API /business/[id]] Listings error:`, listingsErr);
  }

  // Haal reviews op (indien aanwezig) – expliciete relatie om dubbelzinnigheid te voorkomen
  let reviews: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    date?: string;
    author?: string | null;
  }> = [];
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  try {
    const { data: reviewData, error: reviewsErr } = await supabase
      .from("reviews")
      .select("id,rating,comment,created_at,author:profiles!reviews_author_id_fkey(display_name)")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (reviewsErr) {
      console.error(`[API /business/[id]] Reviews error:`, reviewsErr);
    } else if (reviewData) {
      interface RawReview { id: string; rating: number; comment?: string | null; created_at?: string; author?: unknown }
      reviews = (reviewData as RawReview[]).map((r) => {
        const raw = r.author;
        let display: string | null = null;
        if (Array.isArray(raw)) display = (raw[0] as { display_name?: string })?.display_name ?? null;
        else if (raw && typeof raw === 'object') display = (raw as { display_name?: string }).display_name ?? null;
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          date: r.created_at,
          author: display,
        };
      });
      for (const r of reviews) {
        const rv = Math.round(Number(r.rating) || 0) as 1|2|3|4|5|0;
        if (rv >= 1 && rv <= 5) ratingCounts[rv] = (ratingCounts[rv] || 0) + 1;
      }
    }
  } catch (e) {
    console.warn('[API /business/[id]] Onverwachte review fetch fout', e);
  }

  // Statistieken
  const stats = {
    totalListings: listings?.length ?? 0,
    sold: listings?.filter(l => l.status === "sold").length ?? 0,
    avgPrice: listings && listings.length ? Math.round(listings.reduce((sum, l) => sum + (l.price ?? 0), 0) / listings.length) : 0,
    views: listings?.reduce((sum, l) => sum + (l.views?.count ?? 0), 0) ?? 0,
    bids: listings?.reduce((sum, l) => sum + (l.bids?.count ?? 0), 0) ?? 0,
  };

  console.log(`[API /business/[id]] Response:`, { business, listings, reviews, stats });

  const row = business as Record<string, unknown>;
  return NextResponse.json({
    ...business,
    // Aliassen voor frontend gemak
    name: pickStr(row, 'company_name','shop_name','full_name') || 'Onbekend',
    logoUrl: pickStr(row,'business_logo_url','avatar_url'),
    bannerUrl: pickStr(row,'business_banner_url'),
    description: pickStr(row,'business_bio','bio'),
    listings: listings ?? [],
    // Voeg berekende rating & reviewCount toe zodat frontend altijd gemiddelde ziet
    reviews,
    rating: (() => {
      // Gebruik bestaande kolom indien aanwezig, anders bereken uit reviews
      const raw = (business as unknown as { rating?: number; avg_rating?: number }).rating;
      const avgCol = (business as unknown as { avg_rating?: number }).avg_rating;
      if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
      if (typeof avgCol === 'number' && !Number.isNaN(avgCol)) return avgCol;
      if (reviews.length) {
        const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
        return Number((sum / reviews.length).toFixed(2));
      }
      return 0;
    })(),
    reviewCount: (() => {
      const rc1 = (business as unknown as { review_count?: number }).review_count;
      const rc2 = (business as unknown as { reviews?: number }).reviews; // sommige schema's
      if (typeof rc1 === 'number' && rc1 >= 0) return rc1;
      if (typeof rc2 === 'number' && rc2 >= 0) return rc2;
      return reviews.length;
    })(),
  ratingBreakdown: ratingCounts,
    stats,
  });
}
