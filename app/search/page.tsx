import Link from "next/link";

import BackBar from "@/components/BackBar";
import CategorySidebar from "@/components/CategorySidebar";
import ListingCard from "../../components/ListingCard";
import SearchHeader from "@/components/SearchHeader";
import { supabaseServer } from "@/lib/supabaseServer";

type SimpleListing = { id: string; title: string; price: number | string; images?: string[]; created_at?: string };

async function fetchListingsDirect(q?: string, catSlug?: string, subSlug?: string) {
  const supabase = supabaseServer();
  let query = supabase
    .from('listings')
    .select('id,title,price,images,created_at,categories', { count: undefined })
    .eq('status', 'actief')
    .order('created_at', { ascending: false })
    .limit(24);
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (catSlug) {
    query = query.eq('categories.slug', catSlug);
  }
  if (subSlug) {
    query = query.eq('categories.parent_slug', subSlug);
  }
  const { data } = await query;
  return { items: (data || []) as SimpleListing[] };
}

async function fetchListingsByIds(ids: string[], catSlug?: string, subSlug?: string) {
  if (!ids || ids.length === 0) return { items: [] as SimpleListing[] };
  const supabase = supabaseServer();
  let query = supabase
    .from('listings')
    .select('id,title,price,images,created_at,categories', { count: undefined })
    .in('id', ids)
    .eq('status', 'actief');
  if (catSlug) {
    query = query.eq('categories.slug', catSlug);
  }
  if (subSlug) {
    query = query.eq('categories.parent_slug', subSlug);
  }
  const { data } = await query;
  const items = (data || []) as SimpleListing[];
  // Preserve original order of ids
  const order = new Map(ids.map((id, i) => [id, i] as const));
  items.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
  return { items };
}

async function fetchBusinessProfiles(q?: string) {
  if (!q || q.length < 3) return [] as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_business: boolean }>;
  const supabase = supabaseServer();
  // Stap 1: vind user_id's van listings met matchende title of description
  const { data: listingMatches, error: lErr } = await supabase
    .from('listings')
    .select('user_id,title,description')
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(300);
  if (lErr || !listingMatches) return [];
  interface ListingMatch { user_id: string | null }
  const ids = Array.from(new Set((listingMatches as ListingMatch[]).map(r => r.user_id).filter((v): v is string => !!v)));
  if (ids.length === 0) return [];
  // Stap 2: haal business profielen op
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id,full_name,avatar_url,is_business')
    .in('id', ids.slice(0, 60));
  if (pErr || !profiles) return [];
  interface ProfileRow { id: string; full_name: string | null; avatar_url: string | null; is_business: boolean }
  const business = (profiles as ProfileRow[]).filter((p: ProfileRow) => p.is_business).slice(0, 12);
  return business as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_business: boolean }>;
}

async function fetchBusinessProfilesByListingIds(ids: string[]) {
  if (!ids || ids.length === 0) return [] as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_business: boolean }>;
  const supabase = supabaseServer();
  // Haal unieke user_ids op voor de gegeven listings
  const { data: listingRows } = await supabase
    .from('listings')
    .select('user_id')
    .in('id', ids)
    .limit(300);
  type ListingRow = { user_id: string | null };
  const sellerIds = Array.from(new Set(((listingRows || []) as ListingRow[]).map(r => r.user_id).filter((v): v is string => !!v)));
  if (sellerIds.length === 0) return [];
  // Haal business profielen op voor deze sellers
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,full_name,avatar_url,is_business')
    .in('id', sellerIds.slice(0, 60));
  type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null; is_business: boolean };
  const business = ((profiles || []) as ProfileRow[]).filter(p => p.is_business).slice(0, 12);
  return business as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_business: boolean }>;
}

type BusinessProfile = { id: string; full_name: string | null; avatar_url: string | null; is_business: boolean };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; ids?: string; category?: string; sub?: string } }) {
  const q = searchParams.q?.trim() || '';
  const idsParam = (searchParams.ids || '').trim();
  const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
  const catSlug = searchParams.category?.trim() || '';
  const subSlug = searchParams.sub?.trim() || '';

  const { data: categories } = await supabaseServer()
    .from("categories")
    .select("*, subcategories(*)")
    .order("name");

type CategoryWithSubs = {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string; slug: string }[];
};

type Category = {
  id: number;
  name: string;
  slug: string;
  subcategories: Array<{ id: number; name: string; slug: string }>;
};

  const sidebarCategories: Category[] = (categories as unknown as CategoryWithSubs[] | null)?.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subcategories: cat.subcategories?.map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
    })) || [],
  })) || [];

  const t0 = Date.now();
  let listingResult: { items: SimpleListing[] }; let businessProfiles: BusinessProfile[];
  try {
    if (ids.length > 0) {
      const results = await Promise.all([
        fetchListingsByIds(ids, catSlug, subSlug),
        fetchBusinessProfilesByListingIds(ids)
      ]);
      listingResult = results[0] as { items: SimpleListing[] };
      businessProfiles = results[1] as BusinessProfile[];
    } else {
      const results = await Promise.all([
        fetchListingsDirect(q, catSlug, subSlug),
        fetchBusinessProfiles(q)
      ]);
      listingResult = results[0] as { items: SimpleListing[] };
      businessProfiles = results[1] as BusinessProfile[];
    }
  } catch {
    listingResult = { items: [] };
    businessProfiles = [];
  }
  const items: SimpleListing[] = listingResult.items;
  const serverDuration = Date.now() - t0;
  return (
    <div className="container py-6 md:py-8 space-y-6">
      {/* Terugkeer button */}
      <div className="mb-4">
        <BackBar />
      </div>

  {/* Zoekbalk bovenaan resultaten */}
  <SearchHeader total={items.length} />

  <div className="flex gap-6">
    <div className="hidden md:block w-64 flex-shrink-0">
      <CategorySidebar categories={sidebarCategories} />
    </div>
    <div className="flex-1">

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Zoekresultaten</h1>
      <div className="text-sm text-gray-600">
        {ids.length > 0
          ? `Visuele overeenkomst: ${ids.length} matches`
          : q
            ? `Zoekwoord: "${q}"`
            : `Nieuwe zoekertjes`}
        {" "}
        <span className="text-sm text-gray-400">{serverDuration}ms</span>
      </div>
    {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">Ø</div>
      <h2 className="text-sm font-medium">Geen zoekertjes gevonden</h2>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">Probeer een andere foto of een ander zoekwoord.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
          {items.map((i: SimpleListing) => <ListingCard key={i.id} item={i} />)}
        </div>
      )}
  {q && businessProfiles && businessProfiles.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Zakelijke verkopers met gelijkaardige producten</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {businessProfiles.map((p: BusinessProfile) => {
              const initials = (p.full_name || '').split(' ').map((s: string) => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
              return (
                <Link key={p.id} href={`/seller/${p.id}`} className="group flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-2 ring-white shadow">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt={p.full_name || 'Seller'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-600">{initials || 'BZ'}</span>
                    )}
                  </div>
                  <span className="mt-2 line-clamp-2 text-sm font-medium text-gray-700 group-hover:text-gray-900 max-w-[90px]">{p.full_name || 'Zakelijke verkoper'}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>
    </div>
  );
}
