import Image from 'next/image';

// import Link from 'next/link';
import ListingCard from '@/components/ListingCard';
import { supabaseServer } from '@/lib/supabaseServer';

import BusinessAanbodFilters from '../../../../components/BusinessAanbodFilters';
import BusinessCategorySidebar from '../../../../components/BusinessCategorySidebar';

interface ListingRow { id: string; title?: string | null; price?: number | null; images?: string[] | null; created_at?: string | null; views?: number | null; favorites?: number | null; favorites_count?: number | null; seller_id?: string | null; status?: string | null; category_id?: number | null }
interface ProfileRow { id: string; shop_name?: string | null; display_name?: string | null; full_name?: string | null; business_banner_url?: string | null; business_logo_url?: string | null; avatar_url?: string | null; categories?: string[] | null }

export const dynamic = 'force-dynamic';

export default async function BusinessFullAanbodPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string,string | string[] | undefined> }) {
  const supabase = supabaseServer();
  let businessId = params.id;

  // Resolve profile (accept id or slug)
  let profile: ProfileRow | null = null;
  {
  const byId = await supabase.from('profiles').select('id,shop_name,display_name,full_name,business_banner_url,business_logo_url,avatar_url,categories').eq('id', businessId).maybeSingle();
    profile = byId.data;
    if (!profile) {
  const bySlug = await supabase.from('profiles').select('id,shop_name,display_name,full_name,business_banner_url,business_logo_url,avatar_url,categories').eq('shop_slug', params.id).maybeSingle();
      if (bySlug.data) { profile = bySlug.data; businessId = bySlug.data.id; }
    }
  }
  if (!profile) {
    return <div className="container py-16"><div className="text-center space-y-4"><h1 className="text-2xl font-semibold">Profiel niet gevonden</h1><a href="/explore" className="btn btn-sm">Terug</a></div></div>;
  }

  // Filters
  const qText = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  const minPrice = searchParams.min ? Number(searchParams.min) : undefined;
  const maxPrice = searchParams.max ? Number(searchParams.max) : undefined;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'relevance';
  const catParam = typeof searchParams.cat === 'string' ? searchParams.cat : '';
  const activeCatId = catParam && !Number.isNaN(Number(catParam)) ? Number(catParam) : undefined;

  let listings: ListingRow[] = [];
  let categories: { id: number; name: string; count: number }[] = [];
  try {
    // First, get global categories with the SAME ordering as marketplace (relation-first with name order, fallback sort_order)
    const rel = await supabase
      .from('categories')
      .select('id, name, slug, sort_order, is_active, subcategories(id, name, slug, sort_order, is_active)')
      .order('name', { ascending: true });
    type FlatCategoryRow = { id: number; name: string; slug: string; parent_id?: number | null; sort_order?: number | null; is_active?: boolean | null; subcategories?: FlatCategoryRow[] };
    let categoriesData = rel.data as FlatCategoryRow[] | null;
    if (rel.error || !rel.data || (rel.data as FlatCategoryRow[]).every(c => !c.subcategories?.length)) {
      const flat = await supabase
        .from('categories')
        .select('id, name, slug, parent_id, sort_order, is_active')
        .order('sort_order', { ascending: true });
      if (flat.data) {
        const parents = (flat.data as FlatCategoryRow[]).filter(r => !r.parent_id);
        const byParent: Record<number, FlatCategoryRow[]> = {};
        for (const row of flat.data as FlatCategoryRow[]) {
          if (row.parent_id) {
            byParent[row.parent_id] = byParent[row.parent_id] || [];
            byParent[row.parent_id].push(row);
          }
        }
        categoriesData = parents.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sort_order: p.sort_order ?? null,
          is_active: p.is_active ?? null,
          subcategories: (byParent[p.id] || []).map(s => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            sort_order: s.sort_order ?? null,
            is_active: s.is_active ?? null,
          })),
        }));
      }
    }
    // Apply custom desired order provided for Business place
    const desiredOrderNames = [
      'Agrarisch',
      'Audio Pro',
      'Auto & Moto',
      "Auto's",
      'Baby & Kind',
      'Beauty & Gezondheid',
      'Beveiliging',
      'Boeken',
      'Boeken & Media',
      'Bouw & Gereedschap',
      'Caravans & Kamperen',
      'Diensten',
      'Dieren',
      'Domotica',
      'Elektronica',
      'Energie',
      'Evenementen',
      'Fietsen',
      'Film & Series',
      'Foto & Video',
      'Gaming',
      'Gratis & Ruilen',
      'Horeca & Keuken',
      'Huis & Inrichting',
      'Huis & Tuin',
      'Huishoudelijk',
      "Kinderen & Baby's",
      'Kleding',
      'Kleding & Accessoires',
      'Kunst & Antiek',
      'Medisch & Zorg',
      'Motoren & Scooters',
      'Muziek',
      'Muziek & Film',
      'Reizen',
      'Schoenen',
      'Sieraden & Horloges',
      'Software',
      'Spelletjes & Toys',
      'Sport & Vrije tijd',
      'Tuin & Doe-het-zelf',
      'Verzamelen',
      'Watersport',
      'Zakelijk',
    ];
    const orderIndex = new Map<string, number>();
    for (let i = 0; i < desiredOrderNames.length; i++) {
      const k = desiredOrderNames[i].toLowerCase();
      if (!orderIndex.has(k)) orderIndex.set(k, i); // ignore duplicates, keep first
    }
    const parentsRaw = ((categoriesData ?? []) as FlatCategoryRow[])
      .filter(c => c.is_active !== false);
    parentsRaw.sort((a, b) => {
      const ia = orderIndex.get(a.name.toLowerCase());
      const ib = orderIndex.get(b.name.toLowerCase());
      const aa = ia !== undefined ? ia : Number.MAX_SAFE_INTEGER;
      const bb = ib !== undefined ? ib : Number.MAX_SAFE_INTEGER;
      if (aa !== bb) return aa - bb;
      return a.name.localeCompare(b.name);
    });
    const orderedParents = parentsRaw.map(c => ({ id: c.id, name: c.name, sort_order: c.sort_order ?? 0 }));
    // Build name->id map from ordered list
    const nameToId = new Map<string, number>(orderedParents.map(c => [c.name, c.id]));

    // Get seller's selected categories (names) and convert to ids
    const selectedCatNames = Array.isArray(profile.categories) ? profile.categories : [];
    const selectedCatIds = selectedCatNames.map(name => nameToId.get(name)).filter(id => id != null) as number[];

    let query = supabase
  .from('listings')
	.select('id,title,price,images,created_at,views,favorites_count,status,seller_id,category_id')
  .eq('seller_id', businessId);
    if (qText) query = query.ilike('title', `%${qText}%`);
    if (minPrice != null && !Number.isNaN(minPrice)) query = query.gte('price', minPrice);
    if (maxPrice != null && !Number.isNaN(maxPrice)) query = query.lte('price', maxPrice);
  if (activeCatId) query = query.eq('category_id', activeCatId);
    // Sorting - align with marketplace keys
    switch (sort) {
      case 'date_desc':
        query = query.order('created_at', { ascending: false });
        break;
      case 'date_asc':
        query = query.order('created_at', { ascending: true });
        break;
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'views_desc':
        query = query.order('views', { ascending: false });
        break;
      case 'views_asc':
        query = query.order('views', { ascending: true });
        break;
      case 'favorites_desc':
        query = query.order('favorites_count', { ascending: false });
        break;
      case 'favorites_asc':
        query = query.order('favorites_count', { ascending: true });
        break;
      case 'relevance':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }
    const qRes = await query;
    if (qRes.data) {
  listings = (qRes.data as ListingRow[]).map((l: ListingRow) => ({
        ...l,
        favorites: l.favorites_count != null ? l.favorites_count : 0,
        status: l.status === 'actief' ? 'active' : l.status,
      }));
      // Calculate counts for selected categories
      const countMap = new Map<number, number>();
      if (selectedCatIds.length) {
        // Count listings per selected category
        let catQuery = supabase
          .from('listings')
          .select('category_id', { count: 'exact', head: false })
          .eq('seller_id', businessId)
          .in('category_id', selectedCatIds);
        if (qText) catQuery = catQuery.ilike('title', `%${qText}%`);
        if (minPrice != null && !Number.isNaN(minPrice)) catQuery = catQuery.gte('price', minPrice);
        if (maxPrice != null && !Number.isNaN(maxPrice)) catQuery = catQuery.lte('price', maxPrice);
        const catRes = await catQuery;
        if (catRes.data) {
          type Row = { category_id: number | null };
          for (const r of catRes.data as unknown as Row[]) {
            if (r.category_id != null && selectedCatIds.includes(r.category_id)) {
              countMap.set(r.category_id, (countMap.get(r.category_id) || 0) + 1);
            }
          }
        }
      }

      // Build categories list from selected ones; preserve EXACT marketplace order by intersecting orderedParents
      if (selectedCatIds.length) {
        const selectedSet = new Set(selectedCatIds);
        categories = orderedParents
          .filter(c => selectedSet.has(c.id))
          .map(c => ({ id: c.id, name: c.name, count: countMap.get(c.id) || 0 }));
      }
    }
  } catch (e) {
    // ignore
  }

  const displayName = profile.shop_name || profile.display_name || profile.full_name || 'Winkel';
  const bannerSrc = profile.business_banner_url || '/placeholder.svg';
  const logoSrc = profile.business_logo_url || profile.avatar_url || '/placeholder.svg';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="relative">
        <div className="container pt-4 md:pt-6">
          <div className="relative">
            <div className="h-[220px] md:h-[260px] w-full overflow-hidden rounded-2xl md:rounded-3xl border bg-neutral-100 shadow-sm">
              <Image src={bannerSrc} alt="Banner" fill priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
            </div>
            {/* Logo + title outside the clipped container so it's fully visible */}
            <div className="absolute bottom-0 left-6 md:left-10 translate-y-1/2 flex items-center">
              <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg bg-white border">
                <Image src={logoSrc} alt={displayName} fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </header>
  <main className="container flex-1 pt-20 md:pt-24 pb-8 md:pb-10 space-y-8">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Volledig aanbod van {displayName}</h1>
            <p className="text-sm text-gray-600">{listings.length} resultaten{activeCatId && categories.length ? (() => { const c = categories.find(c=>c.id===activeCatId); return c ? <> in <span className="font-medium">{c.name}</span></> : null; })() : null}</p>
          </header>
          <BusinessAanbodFilters initial={{ q: qText, min: minPrice, max: maxPrice, sort, cat: activeCatId }} categories={categories} />
          <div className="md:grid md:grid-cols-12 md:gap-8 lg:gap-10">
            <aside className="hidden md:block md:col-span-3 lg:col-span-2">
              <BusinessCategorySidebar categories={categories.map(c => ({ id: c.id, name: c.name }))} searchParams={searchParams} />
            </aside>
            <div className="md:col-span-9 lg:col-span-10">
              {listings.length > 0 ? (
                <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
                  {listings.map(l => {
                    const listingForCard = {
                      id: l.id,
                      title: l.title || '',
                      price: l.price ?? 0,
                      images: l.images || [],
                      created_at: l.created_at,
                      views: l.views ?? 0,
                      favorites: l.favorites != null ? l.favorites : (l.favorites_count != null ? l.favorites_count : 0),
                    };
                    return <li key={l.id}><ListingCard listing={listingForCard} /></li>;
                  })}
                </ul>
              ) : (
                <div className="p-10 border rounded-xl bg-white text-center text-sm text-gray-500">Geen aanbod gevonden.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
