import dynamicImport from "next/dynamic";

import BackBar from "@/components/BackBar";
import CategorySidebar from "@/components/CategorySidebar";
import FeaturedStrip from "@/components/FeaturedStrip";
import HeroSearch from "@/components/HeroSearch";
import MarketplaceFilters from "@/components/MarketplaceFilters";
import MarketplaceMapModal from "@/components/MarketplaceMapModal";
import RatingStars from "@/components/RatingStars";
import Tooltip from "@/components/Tooltip";
import { formatPrice } from "@/lib/formatPrice";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCategoriesWithSubcategories } from "@/lib/services/category.service";
import type { Category, Listing as BaseListing, Subcategory } from "@/lib/types";

import CollapsibleContainer from "../../components/CollapsibleContainer";
import ListingCard from "../../components/ListingCard";

export const dynamic = 'force-dynamic';

const ListingImageSlider = dynamicImport(() => import("@/components/ListingImageSlider"), { ssr: false });
const ListingCardStats = dynamicImport(() => import("@/components/ListingCardStats"), { ssr: false });

type Listing = BaseListing & {
  category_id?: number;
  subcategory_id?: number;
  views?: number;
  favorites_count?: number;
  allowOffers?: boolean;
  highestBid?: number;
  min_bid?: number;
  seller_id?: string | null;
};

type RowListing = {
  id: string;
  title?: string | null;
  price?: number | string | null;
  location?: string | null;
  state?: string | null;
  description?: string | null;
  images?: string[] | null;
  main_photo?: string | null;
  listing_number?: string | null;
  created_at?: string | null;
  isBusinessSeller?: boolean | null;
  sponsored?: boolean | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  views?: number | null;
  favorites_count?: number | null;
  allowOffers?: boolean | null;
  highestBid?: number | null;
  min_bid?: number | null;
  categories?: number[] | null; // oude array kolom met (sub)category ids
  seller_id?: string | null;
  seller_name?: string | null; // optioneel (indien later via view of join beschikbaar)
  seller_rating?: number | null;
  seller_review_count?: number | null;
};

export default async function MarketplacePage({ searchParams }: { searchParams?: Record<string, string> }) {
  const supabase = supabaseServer();

  // Get current page from searchParams (server-side only)
  let page = 1;
  if (searchParams?.page && !isNaN(Number(searchParams.page))) page = Number(searchParams.page);
  if (page < 1) page = 1;

  const PAGE_SIZE = 10;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Filters uit URL
  // Category & subcategory kunnen als ID (nummer) of slug (string) in de query staan.
  let categoryFilter: number | undefined = undefined;
  let subcategoryFilter: number | undefined = undefined;
  // Ondersteun ook legacy ?cat= naast ?category=
  const categoryRaw = searchParams?.category || searchParams?.cat; // slug of id
  const subcategoryRaw = searchParams?.sub || searchParams?.subcategory; // slug of id (legacy 'subcategory')
  // Helper bepaald of een string numeriek is
  const isNumeric = (v?: string) => !!v && /^\d+$/.test(v);
  if (isNumeric(categoryRaw || "")) categoryFilter = Number(categoryRaw);
  if (isNumeric(subcategoryRaw || "")) subcategoryFilter = Number(subcategoryRaw);

  // Indien slug: lookup in DB (Supabase server client reused)
  if (!categoryFilter && categoryRaw && !isNumeric(categoryRaw)) {
    // Eerst proberen op slug
    let { data: catBySlug } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categoryRaw)
      .maybeSingle();
    
    // Als geen slug gevonden, proberen op naam (voor backward compatibility)
    if (!catBySlug?.id) {
      const { data: catByName } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", categoryRaw)
        .maybeSingle();
      catBySlug = catByName;
    }
    
    if (catBySlug?.id) categoryFilter = catBySlug.id;
  }
  if (!subcategoryFilter && subcategoryRaw && !isNumeric(subcategoryRaw)) {
    // Eerst proberen op slug
    let { data: subBySlug } = await supabase
      .from("subcategories")
      .select("id, category_id")
      .eq("slug", subcategoryRaw)
      .maybeSingle();
    
    // Als geen slug gevonden, proberen op naam
    if (!subBySlug?.id) {
      const { data: subByName } = await supabase
        .from("subcategories")
        .select("id, category_id")
        .ilike("name", subcategoryRaw)
        .maybeSingle();
      subBySlug = subByName;
    }
    
    if (subBySlug?.id) {
      subcategoryFilter = subBySlug.id;
      if (!categoryFilter && subBySlug.category_id) categoryFilter = subBySlug.category_id as number;
    }
  }
  const priceMin = searchParams?.priceMin ? Number(searchParams.priceMin) : undefined;
  const priceMax = searchParams?.priceMax ? Number(searchParams.priceMax) : undefined;
  const stateFilter = searchParams?.state || undefined;
  const locationFilter = searchParams?.location || undefined;
  const sort = searchParams?.sort || "relevance";
  // Nieuwe logica: business=1 (of afwezig) => toon zakelijke; business=0 => verberg zakelijke
  const hideBusiness = searchParams?.business === "0";
  const centerLat = searchParams?.clat ? Number(searchParams.clat) : undefined;
  const centerLng = searchParams?.clng ? Number(searchParams.clng) : undefined;
  const radiusKm = searchParams?.radius ? Number(searchParams.radius) : undefined;
  const debugMode = searchParams?.debug === '1';
  // Area (bbox) format: bbox:minLat,minLng,maxLat,maxLng
  let areaBBox: { minLat: number; minLng: number; maxLat: number; maxLng: number } | undefined;
  if (searchParams?.area && searchParams.area.startsWith('bbox:')) {
    const parts = searchParams.area.replace('bbox:', '').split(',').map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      const [a,b,c,d] = parts;
      areaBBox = { minLat: Math.min(a,c), minLng: Math.min(b,d), maxLat: Math.max(a,c), maxLng: Math.max(b,d) };
    }
  }

  // --- Listings (met count) ---
  type RawListingRow = RowListing & { latitude?: number | null; longitude?: number | null };
  let listingsDataRaw: RawListingRow[] | null = [];
  let error: { message: string } | null = null;
  let count: number | null = null;

  // Basis query (na normalisatie volstaat kolom filtering)
  // Alleen actieve listings tonen, verkochte items uitsluiten
  let query = supabase.from("listings").select("*", { count: "exact" }).eq("status", "actief").neq("status", "verkocht");
  // Basis query. Later: kan beperkt veldselect worden voor performance.

    if (subcategoryFilter) {
      query = query.eq('subcategory_id', subcategoryFilter);
    } else if (categoryFilter) {
      // Alle subcategory listings hebben nu ook category_id ingevuld door migratie
      query = query.eq('category_id', categoryFilter);
    }

    if (typeof priceMin === "number" && !isNaN(priceMin)) query = query.gte("price", priceMin);
    if (typeof priceMax === "number" && !isNaN(priceMax)) query = query.lte("price", priceMax);
    if (stateFilter) query = query.ilike("state", `%${stateFilter}%`);
    if (locationFilter) query = query.ilike("location", `%${locationFilter}%`);
  if (hideBusiness) query = query.neq("isBusinessSeller", true);
    if (areaBBox) {
      query = query
        .gte('latitude', areaBBox.minLat)
        .lte('latitude', areaBBox.maxLat)
        .gte('longitude', areaBBox.minLng)
        .lte('longitude', areaBBox.maxLng);
    }
    if (sort === "date_desc") query = query.order("created_at", { ascending: false });
    else if (sort === "date_asc") query = query.order("created_at", { ascending: true });
    else if (sort === "price_asc") query = query.order("price", { ascending: true });
    else if (sort === "price_desc") query = query.order("price", { ascending: false });
    else if (sort === "views_desc") query = query.order("views", { ascending: false });
    else if (sort === "views_asc") query = query.order("views", { ascending: true });
    else if (sort === "favorites_desc") query = query.order("favorites_count", { ascending: false });
    else if (sort === "favorites_asc") query = query.order("favorites_count", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    query = query.range(from, to);
    const q = await query;
    if (q.error) {
      // Server side log voor debugging
      console.error('[Marketplace] Listings query error:', q.error.message, q.error);
    }
    listingsDataRaw = (q.data ?? []) as RawListingRow[];
    error = q.error ? { message: q.error.message } : null;
    count = q.count;

  // Geen fallback meer nodig: category_id / subcategory_id zijn gevuld.
  const listingsData = (listingsDataRaw ?? []) as unknown as RowListing[];

  interface GeoListingExtras { latitude?: number | null; longitude?: number | null; }
  const listings: (Listing & GeoListingExtras & { categories_raw?: number[] })[] = (listingsData ?? []).map((x: RowListing | (RowListing & GeoListingExtras)) => ({
    id: x.id,
    title: String(x.title ?? ""),
    price: Number(x.price ?? 0),
    location: x.location ?? "",
    state: (x.state as Listing["state"]) ?? undefined,
    description: x.description ?? "",
    images: Array.isArray(x.images) ? x.images : [],
    main_photo: x.main_photo ?? (Array.isArray(x.images) && x.images.length ? x.images[0] : undefined),
    listing_number: typeof x.listing_number === 'number' ? x.listing_number : undefined,
    created_at: x.created_at ?? "",
    isBusinessSeller: x.isBusinessSeller ?? false,
    sponsored: x.sponsored ?? false,
    category_id: (x.category_id ?? undefined) as number | undefined,
    subcategory_id: (x.subcategory_id ?? undefined) as number | undefined,
    views: Number(x.views ?? 0),
    favorites_count: Number(x.favorites_count ?? 0),
    allowOffers: x.allowOffers ?? false,
    highestBid: typeof x.highestBid === "number" ? x.highestBid : undefined,
    min_bid: typeof x.min_bid === "number" ? x.min_bid : undefined,
    latitude: 'latitude' in x ? (x as GeoListingExtras).latitude ?? undefined : undefined,
    longitude: 'longitude' in x ? (x as GeoListingExtras).longitude ?? undefined : undefined,
  seller_id: (x as { seller_id?: string | null }).seller_id || null,
  categories_raw: Array.isArray(x.categories)
    ? (x.categories
      .map((v: string | number) => (typeof v === "string" ? Number(v) : v))
      .filter((v: string | number): v is number => typeof v === "number" && !isNaN(v)) as number[])
    : undefined,
  }));

  // Seller rating aggregatie (lightweight)
  const sellerIds = Array.from(new Set(listings.map(l => l.seller_id).filter(Boolean))) as string[];
  let sellerRatings: Record<string, { rating: number; count: number }> = {};
  const sellerProfiles: Record<string, { name: string; avatar_url: string | null; is_business?: boolean | null; is_verified?: boolean | null; vat?: string | null }> = {};
  if (sellerIds.length) {
    // Profiel basis info ophalen (display_name/full_name en avatar)
    interface ProfileRow { id: string; display_name?: string | null; full_name?: string | null; avatar_url?: string | null; is_business?: boolean | null; stripe_account_id?: string | null; vat?: string | null; }
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id,display_name,full_name,avatar_url,is_business,stripe_account_id,vat')
      .in('id', sellerIds)
      .limit(300);
    if (profileRows) {
      (profileRows as ProfileRow[]).forEach((p) => {
        sellerProfiles[p.id] = {
          name: p.display_name || p.full_name || 'Verkoper',
          avatar_url: p.avatar_url || null,
          is_business: p.is_business ?? null,
          is_verified: false, // wordt later ingevuld
          vat: p.vat || null,
        };
      });
      
      // Verificatie controleren voor sellers met stripe_account_id
      const sellersWithStripe = (profileRows as ProfileRow[]).filter(p => p.stripe_account_id);
      if (sellersWithStripe.length > 0) {
        try {
          const stripeSecret = process.env.STRIPE_SECRET_KEY;
          if (stripeSecret) {
            const { default: Stripe } = await import('stripe');
            const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
            
            for (const seller of sellersWithStripe) {
              if (seller.stripe_account_id) {
                try {
                  const account = await stripe.accounts.retrieve(seller.stripe_account_id);
                  if (account.details_submitted) {
                    sellerProfiles[seller.id].is_verified = true;
                  }
                } catch (e) {
                  // Ignore errors for individual accounts
                }
              }
            }
          }
        } catch (e) {
          // Ignore Stripe errors
        }
      }
    }
    const { data: sellerListingsAll } = await supabase
      .from('listings')
      .select('id,seller_id')
      .in('seller_id', sellerIds)
      .limit(600);
  interface SellerListingIdRow { id: string | null; seller_id?: string | null }
  const allListingIds = (sellerListingsAll as SellerListingIdRow[] | null | undefined || []).map((l: SellerListingIdRow) => l.id).filter((v): v is string => Boolean(v));
    if (allListingIds.length) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('rating,listing_id')
        .in('listing_id', allListingIds)
        .limit(5000);
      const listingToSeller: Record<string, string> = {};
  (sellerListingsAll as SellerListingIdRow[] | null | undefined || []).forEach((l: SellerListingIdRow) => { if (l.id && l.seller_id) listingToSeller[l.id] = l.seller_id; });
      const agg: Record<string, { sum: number; count: number }> = {};
      if (reviewRows) {
        interface ReviewRow { listing_id?: string | null; rating?: number | null }
        (reviewRows as ReviewRow[]).forEach((r: ReviewRow) => {
          const sid = r.listing_id ? listingToSeller[r.listing_id] : undefined;
          if (!sid) return;
          const val = Number(r.rating) || 0;
          if (!agg[sid]) agg[sid] = { sum: 0, count: 0 };
          agg[sid].sum += val;
          agg[sid].count += 1;
        });
      }
      // Extra: voor business sellers zonder listing reviews -> probeer business_id aggregatie
      const businessIdsWithout = sellerIds.filter(id => sellerProfiles[id]?.is_business && (!agg[id] || agg[id].count === 0));
      if (businessIdsWithout.length) {
        const { data: bizReviewRows } = await supabase
          .from('reviews')
          .select('rating,business_id')
          .in('business_id', businessIdsWithout)
          .limit(2000);
        if (bizReviewRows) {
          (bizReviewRows as { rating?: number; business_id?: string }[]).forEach(r => {
            if (!r.business_id) return;
            const sid = r.business_id;
            const val = Number(r.rating) || 0;
            if (!agg[sid]) agg[sid] = { sum: 0, count: 0 };
            agg[sid].sum += val;
            agg[sid].count += 1;
          });
        }
      }
      sellerRatings = Object.fromEntries(Object.entries(agg).map(([sid, v]) => [sid, { rating: v.count ? v.sum / v.count : 0, count: v.count }]));
    }
  }

  // --- Categories ---
  // Probeer eerst relationele structuur (categories + subcategories) – kan mislukken (geen relationele setup)
  const { data: categoriesDataRel, error: categoriesRelError } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, is_active, subcategories(id, name, slug, sort_order, is_active)")
    .order("name", { ascending: true });

  interface FlatCategoryRow { id: number; name: string; slug: string; parent_id?: number | null; sort_order?: number | null; is_active?: boolean | null; subcategories?: FlatCategoryRow[]; }
  let categoriesData = categoriesDataRel as FlatCategoryRow[] | null;

  // Fallback: single table met parent_id
  if (categoriesRelError || !categoriesDataRel || categoriesDataRel.every((c: FlatCategoryRow) => !c.subcategories?.length)) {
    const { data: flatData } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order, is_active")
      .order("sort_order", { ascending: true });
    if (flatData) {
      const parents = flatData.filter((r: FlatCategoryRow) => !r.parent_id);
      const byParent: Record<number, FlatCategoryRow[]> = {};
      for (const row of flatData as FlatCategoryRow[]) {
        if (row.parent_id) {
          byParent[row.parent_id] = byParent[row.parent_id] || [];
          byParent[row.parent_id].push(row);
        }
      }
      categoriesData = parents.map((p: FlatCategoryRow) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sort_order: p.sort_order ?? null,
        is_active: p.is_active ?? null,
        subcategories: (byParent[p.id] || []).map((s: FlatCategoryRow) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          sort_order: s.sort_order ?? null,
          is_active: s.is_active ?? null,
        })),
      }));
    }
  }

  type SupabaseCategory = {
    id: number;
    name: string;
    slug: string;
    sort_order?: number;
    is_active?: boolean;
    subcategories?: Subcategory[];
  };

  const categories: Category[] = ((categoriesData ?? []) as SupabaseCategory[]).map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    sort_order: cat.sort_order ?? 0,
    is_active: cat.is_active ?? true,
    subs: Array.isArray(cat.subcategories)
      ? (cat.subcategories as Subcategory[])
          .filter((s) => s?.is_active !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((sub) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            sort_order: sub.sort_order ?? 0,
            is_active: sub.is_active ?? true,
            category_id: cat.id,
          }))
      : [],
  }));

  // Centralize sidebar categories mapping for both desktop and mobile
  const sidebarCategories = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subcategories: cat.subs.map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
    })),
  }));

  // --- Featured (eerst scoped, dan fallback globaal) ---
  // 1) scoped op (sub)categorie
  let featuredQ = supabase
    .from("listings")
    .select("*")
    .eq("sponsored", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (subcategoryFilter) featuredQ = featuredQ.eq("subcategory_id", subcategoryFilter);
  else if (categoryFilter) featuredQ = featuredQ.eq("category_id", categoryFilter);

  const { data: scopedFeatured } = await featuredQ;
  // 2) fallback: als geen scoped resultaten -> globale sponsored
  let featuredData = scopedFeatured ?? [];
  if (!featuredData.length) {
    const { data: globalFeatured } = await supabase
      .from("listings")
      .select("*")
      .eq("sponsored", true)
      .order("created_at", { ascending: false })
      .limit(5);
    featuredData = globalFeatured ?? [];
  }

  interface FeaturedRow { id: number | string; title?: string | null; price?: number | null; images?: string[] | null; main_photo?: string | null; location?: string | null }
  const featuredItems =
    (featuredData as FeaturedRow[] | null | undefined ?? []).map((x: FeaturedRow) => ({
      id: x.id,
      title: String(x.title ?? ""),
      price: Number(x.price ?? 0),
      image: (Array.isArray(x.images) && x.images.length ? x.images[0] : x.main_photo) || null,
      href: `/listings/${x.id}`,
      location: (x.location as string) ?? null,
    })) || [];

  // sellerRatings is hierboven gedefinieerd; geen fallback nodig.

  // --- Fallback koppeling category/subcategory via oude 'categories' array ---
  const safeCategories = categories || [];
  const parentIds = new Set(safeCategories.map((c) => c.id));
  const subIds = new Set(safeCategories.flatMap((c) => c.subs.map((s) => s.id)));
  const subIdToParent = new Map<number, number>();
  for (const c of safeCategories) for (const s of c.subs) subIdToParent.set(s.id, c.id);

  const listingsResolved = listings.map((l) => {
    let catId = l.category_id;
    let subId = l.subcategory_id;

    // 1) Als subId bestaat maar catId niet -> leid af via mapping
    if (subId && !catId && subIdToParent.has(subId)) {
      catId = subIdToParent.get(subId);
    }

    // 2) Gebruik categories_raw fallback
    if ((!catId || !subId) && l.categories_raw && l.categories_raw.length) {
      if (!subId) subId = l.categories_raw.find((id) => subIds.has(id));
      if (!catId) {
        catId = l.categories_raw.find((id) => parentIds.has(id));
        if (!catId && subId && subIdToParent.has(subId)) catId = subIdToParent.get(subId);
      }
    }

    return { ...l, category_id: catId, subcategory_id: subId };
  });

  // Alt fallback verwijderd: uitgebreide OR filtering dekt alle gevallen.

  // Bouw snelle indices voor naam resolutie
  const catIndex = new Map(categories.map(c => [c.id, c.name] as const));
  const subIndex = new Map(categories.flatMap(c => c.subs.map(s => [s.id, { name: s.name, parent: c.id }] as const)));

  interface ListingResolved extends Listing, GeoListingExtras { categories_raw?: number[]; displayCategoryName?: string; displaySubcategoryName?: string; }
  const listingsDisplay = (listingsResolved as ListingResolved[]).map(l => {
    let category_id = l.category_id;
    let subcategory_id = l.subcategory_id;
    // Extra fallback als nog niets gevonden maar categories_raw aanwezig
    if ((!category_id || !subcategory_id) && l.categories_raw) {
      const raw = l.categories_raw;
      if (!subcategory_id) subcategory_id = raw.find(id => subIndex.has(id));
      if (!category_id) {
        category_id = raw.find(id => catIndex.has(id));
        if (!category_id && subcategory_id && subIndex.get(subcategory_id)) category_id = subIndex.get(subcategory_id)!.parent;
      }
    }
    const displayCategoryName = category_id ? (catIndex.get(category_id) || "Onbekend") : "Onbekend";
    const displaySubcategoryName = subcategory_id ? (subIndex.get(subcategory_id)?.name || "Onbekend") : undefined;
    return { ...l, category_id, subcategory_id, displayCategoryName, displaySubcategoryName };
  });

  // Paginatie
  const totalListings = count ?? 0;
  const totalPages = Math.ceil(totalListings / PAGE_SIZE);

  return (
    <div className="container max-w-6xl xl:max-w-7xl py-4">
      <HeroSearch noContainer />

      {/* Terugkeer button - alleen zichtbaar op mobile/tablet */}
      <div className="block md:hidden mb-4">
        <BackBar />
      </div>

  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">{/* Grid stays inside same container for alignment */}
        {/* Categorieën links */}
        <div className="hidden md:block">
        <CategorySidebar
          categories={sidebarCategories}
        />
        </div>

        {/* Listings rechts */}
  <main className="md:col-span-3 space-y-4 pt-[2px]">{/* Tighter vertical spacing */}

          {/* Categorieën - alleen zichtbaar op mobile/tablet */}
          <div className="block md:hidden">
            <CollapsibleContainer
              title="Categorieën"
              defaultOpenDesktop={false}
              defaultOpenMobile={false}
              elevation="flat"
              className="relative"
            >
              <div className="-mt-1">
                <CategorySidebar
                  categories={sidebarCategories}
                />
              </div>
            </CollapsibleContainer>
          </div>

          {/* Filters */}
          <CollapsibleContainer
            title="Filters"
            defaultOpenDesktop={false}
            defaultOpenMobile={false}
            elevation="flat"
            className="relative"
          >
            <div className="-mt-1">{/* tighten internal top spacing */}
              <MarketplaceFilters />
            </div>
          </CollapsibleContainer>

          {/* Uitgelichte strip - altijd zichtbaar (met lege-state als er niks is) */}
          <FeaturedStrip
            title={subcategoryFilter || categoryFilter ? "Uitgelicht in deze categorie" : "Uitgelichte zoekertjes"}
            items={featuredItems}
            className="py-3 lg:py-4"/* shrink internal vertical padding */
          />

          {/* Status / resultaten */}
          <div className="text-sm text-gray-600 -mt-1 mb-0.5">{/* Tighter spacing above and below */}
            {error ? (debugMode ? `Fout bij laden van zoekertjes (${error.message})` : "Fout bij laden van zoekertjes") : `${totalListings} resultaten`}
          </div>

          <div className="flex justify-end -mb-3">{/* Adjust bottom negative margin */}
            <MarketplaceMapModal
              listings={listingsResolved as (Listing & GeoListingExtras)[]}
              centerLat={centerLat}
              centerLng={centerLng}
              radiusKm={radiusKm}
            />
          </div>

          {error ? (
            <div className="card p-10 text-center text-sm text-red-700 bg-red-50">Fout bij laden van zoekertjes</div>
          ) : listings.length === 0 ? (
            <div className="card p-10 text-center text-sm text-gray-600 bg-white">Geen zoekertjes gevonden.</div>
          ) : (
            <>
              {/* Mobile/Tablet: Grid layout zoals homepage */}
              <div className="block lg:hidden">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {listingsDisplay.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={{
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        images: item.images,
                        created_at: item.created_at,
                        views: item.views,
                        favorites_count: item.favorites_count
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop: Lijst layout */}
              <div className="hidden lg:block">
                <ul className="space-y-3">
                  {listingsDisplay.map((item) => (
                    <li key={item.id}>
                      <article className="group relative bg-white border border-gray-200 rounded-lg transition-all duration-200 hover:border-gray-300 hover:shadow-md">
                        <div className="flex items-start gap-6 p-4">
                          {/* Afbeelding */}
                          <div className="shrink-0 w-48 h-48 rounded-lg overflow-hidden bg-gray-50">
                            <ListingImageSlider
                              images={item.images && item.images.length > 0 ? item.images : ["/placeholder.svg"]}
                              title={item.title}
                              link={`/listings/${item.id}`}
                            />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 flex flex-col h-48">
                            {/* Header: Titel en Prijs */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <a 
                                  href={`/listings/${item.id}`} 
                                  className="group/title block"
                                >
                                  <h3 className="text-lg font-semibold text-gray-900 group-hover/title:text-primary transition-colors line-clamp-2 leading-snug mb-2">
                                    {item.title}
                                  </h3>
                                </a>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  {item.location && (
                                    <span>{item.location}</span>
                                  )}
                                  {item.created_at && (
                                    <span>{new Date(item.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}</span>
                                  )}
                                  {item.displayCategoryName && (
                                    <span className="text-gray-500">{item.displayCategoryName}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                  {formatPrice(item.price)}
                                </div>
                                {item.allowOffers && typeof item.highestBid === "number" && (
                                  <div className="text-sm text-gray-600">
                                    Hoogste bod: <span className="font-semibold text-emerald-600">{formatPrice(item.highestBid)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Beschrijving */}
                            {item.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3 flex-shrink-0">
                                {item.description}
                              </p>
                            )}
                            
                            {/* Footer: Verkoper en CTA - uitgelijnd met onderkant afbeelding */}
                            <div className="flex items-center justify-between pt-3 mt-auto border-t border-gray-100 -mx-4 px-4">
                              <div className="flex items-center gap-3">
                                {/* Seller info */}
                                {(() => {
                                  const sid = (listingsDataRaw || []).find(l => l.id === item.id)?.seller_id as string | undefined;
                                  const ratingInfo = sid ? sellerRatings[sid] : undefined;
                                  const profile = sid ? sellerProfiles[sid] : undefined;
                                  const avatar = profile?.avatar_url;
                                  const name = profile?.name || (sid ? `Verkoper ${sid.slice(0,6)}` : 'Verkoper');
                                  return (
                                    <div className="flex items-center gap-2">
                                      {avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
                                      ) : (
                                        <span className="w-8 h-8 rounded-full bg-gray-200 inline-block" aria-hidden="true" />
                                      )}
                                      <div className="flex flex-col">
                                        <span className="flex items-center gap-2">
                                          {sid ? (
                                            <a
                                              href={`/business/${sid}`}
                                              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                                              title={name}
                                            >
                                              {name}
                                            </a>
                                          ) : (
                                            <span className="text-sm font-medium text-gray-900" title={name}>{name}</span>
                                          )}
                                          {profile?.is_business && profile?.vat && (
                                            <Tooltip content="Geregistreerde onderneming">
                                              <span className="inline-block px-1.5 py-0.5 text-[10px] leading-none rounded bg-blue-50 text-blue-700 font-medium">Business</span>
                                            </Tooltip>
                                          )}
                                          {profile?.is_verified && (
                                            <Tooltip content="Geverifieerd">
                                              <span className="inline-block px-1.5 py-0.5 text-[10px] leading-none rounded bg-emerald-50 text-emerald-700 font-medium">✓</span>
                                            </Tooltip>
                                          )}
                                        </span>
                                        {ratingInfo && ratingInfo.count > 0 ? (
                                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                            <RatingStars rating={ratingInfo.rating} size={10} />
                                            <span>{ratingInfo.rating.toFixed(1)}</span>
                                            <span className="text-gray-400">({ratingInfo.count})</span>
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <a
                                href={`/listings/${item.id}`}
                                className="inline-flex items-center justify-center rounded-md bg-primary text-white px-5 py-2 text-sm font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              >
                                Bekijk details
                              </a>
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="flex justify-center items-center gap-2 mt-8">
                    <a
                      href={buildHref(page - 1, searchParams)}
                      className={`px-5 py-2 rounded-full border border-primary bg-white text-primary text-sm font-semibold shadow transition ${
                        page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-primary/10 hover:border-primary/80"
                      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                    >
                      Vorige
                    </a>
                    <span className="px-3 py-2 text-sm text-gray-700">Pagina {page} van {totalPages}</span>
                    <a
                      href={buildHref(page + 1, searchParams)}
                      className={`px-5 py-2 rounded-full border border-primary bg-white text-primary text-sm font-semibold shadow transition ${
                        page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-primary/10 hover:border-primary/80"
                      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                    >
                      Volgende
                    </a>
                  </nav>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function buildHref(p: number, current?: Record<string, string>) {
  // Server-side: we get current as searchParams arg (already parsed)
  const params = new URLSearchParams();
  if (current) {
    for (const [k, v] of Object.entries(current)) {
      if (k === "page") continue;
  if (k === "subcategory") continue; // legacy param overslaan
      if (v != null) params.set(k, v);
    }
  } else if (typeof window !== "undefined") {
    const cur = window.location.search;
    const curParams = new URLSearchParams(cur);
    for (const [k, v] of curParams.entries()) {
      if (k === "page") continue;
  if (k === "subcategory") continue;
      params.set(k, v);
    }
  }
  params.set("page", String(Math.max(1, p)));
  return `?${params.toString()}`;
}
