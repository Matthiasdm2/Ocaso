import Link from "next/link";

import BackBar from "@/components/BackBar";
import ListingCard from "@/components/ListingCard";
import { supabaseServer } from "@/lib/supabaseServer";

type SimpleListing = { id: string; title: string; price: number | string; images?: string[]; created_at?: string };

async function fetchListingsDirect(q?: string) {
  const supabase = supabaseServer();
  let query = supabase
    .from('listings')
    .select('id,title,price,images,created_at', { count: undefined })
    .order('created_at', { ascending: false })
    .limit(24);
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  const { data } = await query;
  return { items: (data || []) as SimpleListing[] };
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

type BusinessProfile = { id: string; full_name: string | null; avatar_url: string | null; is_business: boolean };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() || '';
  const t0 = Date.now();
  let listingResult: { items: SimpleListing[] }; let businessProfiles: BusinessProfile[];
  try {
    const results = await Promise.all([
      fetchListingsDirect(q),
      fetchBusinessProfiles(q)
    ]);
    listingResult = results[0] as { items: SimpleListing[] };
    businessProfiles = results[1] as BusinessProfile[];
  } catch {
    listingResult = { items: [] };
    businessProfiles = [];
  }
  const items: SimpleListing[] = listingResult.items;
  const serverDuration = Date.now() - t0;
  return (
    <div className="container py-6 md:py-8 space-y-6">
      {/* Terugkeer button - alleen zichtbaar op mobile/tablet */}
      <div className="block md:hidden mb-4">
        <BackBar />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Zoekresultaten</h1>
      <div className="text-sm text-gray-600">{q ? `Zoekwoord: "${q}"` : `Nieuwe zoekertjes`} <span className="text-sm text-gray-400">{serverDuration}ms</span></div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">Ø</div>
          <h2 className="text-sm font-medium">Geen zoekertjes gevonden</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Probeer zonder zoekwoord of controleer later opnieuw.</p>
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
  );
}
