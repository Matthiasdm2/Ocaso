import Image from 'next/image';
import Link from 'next/link';

import ListingCard from '@/components/ListingCard';
import { supabaseServer } from '@/lib/supabaseServer';

import BusinessAanbodFilters from '../../../../components/BusinessAanbodFilters';

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
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'nieuwste';
  const catParam = typeof searchParams.cat === 'string' ? searchParams.cat : '';
  const activeCatId = catParam && !Number.isNaN(Number(catParam)) ? Number(catParam) : undefined;

  let listings: ListingRow[] = [];
  let categories: { id: number; name: string; count: number; sort_order: number }[] = [];
  try {
    // First, get all categories and build name-to-id map
    const allCatsRes = await supabase
      .from('categories')
      .select('id, name, sort_order');
    const nameToId = new Map<string, number>();
    const nameToSort = new Map<string, number>();
    if (allCatsRes.data) {
      for (const c of allCatsRes.data as { id: number; name: string; sort_order?: number }[]) {
        nameToId.set(c.name, c.id);
        nameToSort.set(c.name, c.sort_order ?? 0);
      }
    }

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
    // Sorting
    if (sort === 'prijs_hoog') query = query.order('price', { ascending: false });
    else if (sort === 'prijs_laag') query = query.order('price', { ascending: true });
    else if (sort === 'meest_bekeken') query = query.order('views', { ascending: false });
    else query = query.order('created_at', { ascending: false });
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

      // Build categories list from selected ones
      categories = selectedCatNames.map(name => {
        const id = nameToId.get(name);
        return id ? { id, name, count: countMap.get(id) || 0, sort_order: nameToSort.get(name) ?? 0 } : null;
      }).filter(Boolean).sort((a, b) => (a!.sort_order ?? 0) - (b!.sort_order ?? 0)) as { id: number; name: string; count: number; sort_order: number }[];
    }
  } catch (e) {
    // ignore
  }

  const displayName = profile.shop_name || profile.display_name || profile.full_name || 'Winkel';
  const bannerSrc = profile.business_banner_url || '/placeholder.png';
  const logoSrc = profile.business_logo_url || profile.avatar_url || '/placeholder.png';

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
              <div className="sticky top-28 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categorieën</h2>
                {categories.length > 0 ? (
                  <ul className="space-y-1">
                    <li>
                      {(() => { const p = new URLSearchParams(); Object.entries(searchParams).forEach(([k,v])=> { if (typeof v==='string') p.set(k,v); }); p.delete('cat'); const href='?' + p.toString(); return (
                        <Link scroll={false} href={href} className={!activeCatId ? 'block px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium' : 'block px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-neutral-100'}>
                          Alle ({Array.from(categories).reduce((s,c)=> s + c.count, 0)})
                        </Link>
                      ); })()}
                    </li>
                    {categories.map(c => {
                      const href = (() => { const p = new URLSearchParams(); Object.entries(searchParams).forEach(([k,v])=> { if (typeof v==='string') p.set(k,v); }); p.set('cat', String(c.id)); return '?' + p.toString(); })();
                      const active = c.id === activeCatId;
                      return (
                        <li key={c.id}>
                          <Link scroll={false} href={href} className={active ? 'flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200' : 'flex items-center justify-between px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-neutral-100'}>
                            <span className="truncate">{c.name}</span>
                            <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-neutral-200/60 text-neutral-700 font-medium">{c.count}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-4 border rounded-lg bg-white text-sm text-gray-600">Geen categorieën gevonden voor dit aanbod.</div>
                )}
              </div>
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
