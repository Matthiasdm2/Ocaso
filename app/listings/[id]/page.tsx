// app/listings/[id]/page.tsx



export const revalidate = 0; // altijd fresh zodat rating direct zichtbaar is

import Link from "next/link";

import BackBar from "@/components/BackBar";
import BidsModal from "@/components/BidsModal";
import ClientActions from "@/components/ClientActions";
import ImageGallery from "@/components/ImageGallery";
import ListingStats from "@/components/ListingStats";
import MarkBidsSeen from "@/components/MarkBidsSeen";
import SellerPanels from "@/components/SellerPanels";
import SharePanel from "@/components/SharePanel";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Category, Subcategory } from "@/lib/types";



export default async function ListingPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  // Haal het zoekertje op inclusief categorieën
  // Haal listing + gekoppelde seller profiel velden op (naam + avatar)
  const { data: listing, error } = await supabase
    .from("listings")
    // Via foreign key listings_seller_id_fkey koppelen we naar profiles en aliassen dit als seller
    // We halen extra velden op: is_business + created_at (aansluitdatum)
  .select("*,categories,seller:profiles!listings_seller_id_fkey(id,display_name,full_name,avatar_url,is_business,created_at,address,invoice_address,stripe_account_id,vat)")
    .eq("id", params.id)
    .maybeSingle();

  // Haal huidige gebruiker op om te controleren of deze de verkoper is
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isSeller = currentUser && listing && currentUser.id === listing.seller_id;

  // Haal KYC status op voor de verkoper
  const sellerStripeAccountId = (listing as { seller?: { stripe_account_id?: string | null } })?.seller?.stripe_account_id ?? null;
  const sellerKycCompleted = await getSellerKycCompleted(sellerStripeAccountId);

  // Helper functie om KYC status op te halen
  async function getSellerKycCompleted(sellerStripeAccountId: string | null): Promise<boolean> {
    if (!sellerStripeAccountId) return false;
    try {
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecret) return false;
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
      const account = await stripe.accounts.retrieve(sellerStripeAccountId);
      return account.details_submitted && account.charges_enabled;
    } catch (e) {
      console.error('Error fetching KYC status:', e);
      return false;
    }
  }

  // 1) Probeer eerst rating voor dit listing zelf (sneller & altijd relevant)
  let sellerRating: number | null = null;
  let sellerReviewCount: number | null = null;
  if (listing?.id) {
    const { data: listingReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('listing_id', listing.id)
      .limit(200);
    if (listingReviews && listingReviews.length) {
      sellerReviewCount = listingReviews.length;
      interface ReviewRow { rating?: number | null }
      const sum = (listingReviews as ReviewRow[]).reduce((s: number, r: ReviewRow) => s + (Number(r.rating) || 0), 0);
      sellerRating = sum / listingReviews.length;
    }
  }
  // 2) Indien nog niets (geen listing reviews) probeer een seller-brede aggregatie
  if ((sellerReviewCount == null || sellerReviewCount === 0) && listing?.seller_id) {
    const { data: sellerListings } = await supabase
      .from('listings')
      .select('id')
      .eq('seller_id', listing.seller_id)
      .limit(500);
  interface SellerListingRow { id: string | null }
  const listingIds = (sellerListings as SellerListingRow[] | null | undefined || []).map((l: SellerListingRow) => l.id).filter((v): v is string => Boolean(v));
    if (listingIds.length > 0) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('rating,listing_id')
        .in('listing_id', listingIds)
        .limit(1000);
      if (reviewRows && reviewRows.length) {
        sellerReviewCount = reviewRows.length;
        interface ReviewRow2 { rating?: number | null }
        const sum = (reviewRows as ReviewRow2[]).reduce((s: number, r: ReviewRow2) => s + (Number(r.rating) || 0), 0);
        sellerRating = sum / reviewRows.length;
      } else {
        sellerReviewCount = 0;
      }
    }
  }
  // 3) Extra fallback: indien seller business is (of listing heeft business/organization id) en nog geen reviews: business_id aggregatie
  if ((sellerReviewCount == null || sellerReviewCount === 0)) {
    const businessId = (listing as { organization_id?: string | null; business_id?: string | null }).organization_id
      || (listing as { business_id?: string | null }).business_id
      || (listing as { seller?: { is_business?: boolean | null; id?: string | null } }).seller?.is_business
        ? (listing as { seller_id?: string | null }).seller_id
        : null;
    if (businessId) {
      const { data: bizReviews } = await supabase
        .from('reviews')
        .select('rating,business_id')
        .eq('business_id', businessId)
        .limit(2000);
      if (bizReviews && bizReviews.length) {
        sellerReviewCount = bizReviews.length;
        interface BizReviewRow { rating?: number | null }
        const sum = (bizReviews as BizReviewRow[]).reduce((s: number, r: BizReviewRow) => s + (Number(r.rating) || 0), 0);
        sellerRating = sum / bizReviews.length;
      } else if (sellerReviewCount == null) {
        sellerReviewCount = 0;
      }
    }
  }
  // Debug logging server-side
  // eslint-disable-next-line no-console
  console.log('[SellerRating]', {
    listingId: listing?.id,
    sellerId: listing?.seller_id,
    sellerRating,
    sellerReviewCount,
  });
  // Haal alle biedingen direct uit Supabase, gesorteerd op bedrag en datum
  const { data: bids } = await supabase
    .from("bids")
    .select("amount,created_at")
    .eq("listing_id", params.id)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: false });
  // DEBUG: log biedingen naar de server console
  // eslint-disable-next-line no-console
  console.log('Biedingen voor listing', params.id, bids);
  // Hoogste bod is het eerste bod in de array (grootste bedrag, nieuwste bod)
  const highestBid = bids && bids.length > 0 ? bids[0].amount : null;
  const bidCount = bids ? bids.length : 0;

  if (error || !listing) {
    return (
      <div className="container py-8">
        <p className="text-center text-gray-600">Zoekertje niet gevonden.</p>
      </div>
    );
  }

  // Haal categorieën en subcategorieën op
  let category: Category | null = null;
  let subcategory: Subcategory | null = null;
  if (Array.isArray(listing.categories) && listing.categories.length > 0) {
    // listing.categories kan een array van category/subcategory ids zijn
    const catId = Number(listing.categories[0]);
    const subcatId = Number(listing.categories[1]);
    // Haal de categorie op
    const { data: cat } = await supabase.from("categories").select("*").eq("id", catId).maybeSingle();
    category = cat ?? null;
    // Haal de subcategorie op
    if (subcatId) {
      const { data: subcat } = await supabase.from("subcategories").select("*").eq("id", subcatId).maybeSingle();
      subcategory = subcat ?? null;
    }
  }

  // Afbeeldingen ophalen
  const images = Array.isArray(listing.images) ? listing.images : listing.main_photo ? [listing.main_photo] : [];

  // ------- Samengestelde locatie (postcode + gemeente) uit profiel adressen -------
  let sellerLocationCombined: string | null = null;
  try {
    const rawSeller = (listing as { seller?: unknown }).seller as (null | { address?: unknown; invoice_address?: unknown }) | null;
    interface AddrLike { [k: string]: unknown }
    type MaybeAddr = AddrLike | null | undefined;
    const extract = (a: MaybeAddr): { zip: string | null; city: string | null } => {
      if (!a || typeof a !== 'object') return { zip: null, city: null };
      const obj = a as AddrLike;
      const cityVal = obj.city || obj.stad || obj.gemeente || null;
      const zipVal = obj.postcode || obj.postal_code || obj.post_code || obj.zipcode || obj.zip || null;
      return { zip: zipVal != null ? String(zipVal) : null, city: cityVal != null ? String(cityVal) : null };
    };
    const addr = rawSeller?.address as MaybeAddr;
    const inv = rawSeller?.invoice_address as MaybeAddr;
    const primary = extract(addr);
    const backup = extract(inv);
    const zip = primary.zip || backup.zip;
    const city = primary.city || backup.city;
    const combined = [zip, city].filter(Boolean).join(' ');
    sellerLocationCombined = combined || null;
  } catch {
    sellerLocationCombined = null;
  }

  // Vervang de bestaande ListingPage implementatie door de opgehaalde data
  // Je bestaande UI hieronder, met extra categorie/subcategorie info:
  return (
    <div className="container py-12 pb-28 md:pb-12 max-w-5xl mx-auto">{/* pb-28 to make room for sticky mobile bar */}
      {/* Markeer biedingen voor deze listing als gezien in client storage */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          try {
            var key = 'ocaso:lastSeenBids';
            var raw = localStorage.getItem(key);
            var map = raw ? JSON.parse(raw) : {};
            var count = ${Number(bidCount)};
            map['${params.id}'] = count;
            localStorage.setItem(key, JSON.stringify(map));
          } catch (e) {}
        `}}
      />
  {/* Sync server-side "seen" status ook bij bezoek */}
  <MarkBidsSeen listingId={listing.id} count={bidCount} />
      {/* Lint bovenaan met terugknop als Client Component */}
      <BackBar />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Linker hoofdcontainer */}
        <div className="md:col-span-2 flex flex-col gap-8">
          {/* Afbeeldingen container */}
          <div className="relative rounded-2xl border bg-white shadow p-6 w-full mb-2">
            <ImageGallery images={images} title={listing.title} main_photo={listing.main_photo} />
            <div className="absolute top-4 right-4 z-10">
              <ListingStats id={listing.id} views={listing.views ?? 0} favorites={(listing as { favorites_count?: number }).favorites_count ?? 0} />
            </div>
          </div>
          <section className="rounded-xl border bg-white shadow p-4 w-full flex flex-col gap-4">
            {/* Product info */}
            <div className="flex items-center flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Aantal biedingen: {bidCount}</span>
                <BidsModal bids={bids ?? []} />
                <span className="text-sm text-emerald-700 font-semibold">{highestBid ? `€ ${highestBid}` : "—"}</span>
              </div>
              <div className="ml-auto text-sm text-gray-500">
                Geplaatst: {listing.created_at ? new Date(listing.created_at).toLocaleDateString("nl-BE") : "Onbekend"}
              </div>
            </div>
            {/* Biedingen-blok verwijderd op verzoek gebruiker */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 flex-1 min-w-0 break-words">{listing.title}</h1>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-2xl font-semibold text-emerald-700 whitespace-nowrap">€ {listing.price}</span>
                <span className="text-sm px-3 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200 whitespace-nowrap">
                  {listing.status ?? "Onbekend"}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 -mt-0.5 mb-2 flex flex-wrap items-center gap-1">
              {category?.id && category?.name && (
                <Link
                  href={`/marketplace?cat=${category.id}`}
                  className="inline-flex items-center rounded-full bg-gray-100 hover:bg-gray-200 transition px-2 py-0.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {category.name}
                </Link>
              )}
              {subcategory?.id && subcategory?.name && (
                <Link
                  href={`/marketplace?cat=${category?.id ?? ''}&sub=${subcategory.id}`}
                  className="inline-flex items-center rounded-full bg-gray-100 hover:bg-gray-200 transition px-2 py-0.5 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {subcategory.name}
                </Link>
              )}
              {!category?.name && !subcategory?.name && <span>—</span>}
            </div>
            {/* Voorraad indicator */}
            {(listing.stock ?? 1) > 1 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Voorraad:</span>
                {isSeller ? (
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    (listing.stock ?? 1) > 5 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : (listing.stock ?? 1) > 0 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {listing.stock ?? 1} {(listing.stock ?? 1) === 1 ? 'stuk' : 'stuks'} beschikbaar
                  </span>
                ) : (
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Op voorraad
                  </span>
                )}
              </div>
            )}
            {/* Datum verplaatst naar biedingen/hoogste bod rij */}
            {/* Beschrijving */}
            <div className="border-b pb-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Beschrijving</h2>
              <p className="text-gray-700 whitespace-pre-line text-base">{listing.description ?? "Geen beschrijving opgegeven."}</p>
            </div>
            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-b pb-6 mb-6">
              <div>
                <span className="block text-sm text-gray-500 mb-2">Staat</span>
                <span className="text-base text-gray-700">{listing.state ?? "Onbekend"}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-500 mb-2">Locatie</span>
                <span className="text-base text-gray-700">{sellerLocationCombined || listing.location || "Onbekend"}</span>
              </div>
            </div>
            {/* Acties */}
            <div className="mb-6 hidden md:block">{/* hide inline on mobile, use sticky bar */}
              <ClientActions
                listingId={listing.id}
                price={listing.price}
                sellerId={listing.seller?.id ?? null}
                sellerKycCompleted={sellerKycCompleted}
                allowOffers={listing.allowOffers}
                min_bid={listing.min_bid}
                stock={listing.stock ?? 1}
              />
            </div>
          </section>
        </div>
    {/* Verkoper info rechts */}
  <div className="md:col-span-1 md:sticky md:top-24 self-start flex flex-col gap-4">
          {(() => {
            type RawSeller = { id?: string; name?: string; full_name?: string; display_name?: string; avatar_url?: string } | null;
            // listing.seller komt uit de join (alias seller:profiles...) zie select hierboven
            const raw: RawSeller = (listing as { seller?: RawSeller }).seller || null;
            const sellerLocation = sellerLocationCombined || listing.location || null;
            const sellerObj: {
              id: string | null;
              seller_id: string | null;
              name: string | null;
              avatarUrl: string | null;
              seller_avatar_url: string | null;
              seller_rating?: number | null;
              seller_sales_count?: number | null;
              seller_review_count?: number | null;
              seller_is_business?: boolean | null;
              seller_is_verified?: boolean | null;
              seller_vat?: string | null;
              joinedISO?: string | null;
              location?: string | null;
            } = {
              id: raw?.id || (listing as { seller_id?: string }).seller_id || null,
              seller_id: (listing as { seller_id?: string }).seller_id || null,
              name: raw?.name || raw?.full_name || raw?.display_name || null,
              avatarUrl: raw?.avatar_url || null,
              seller_avatar_url: raw?.avatar_url || null,
              seller_rating: sellerRating,
              seller_sales_count: null,
              seller_review_count: sellerReviewCount,
              seller_is_business: (raw as { is_business?: boolean | null })?.is_business ?? null,
              seller_is_verified: sellerKycCompleted,
              seller_vat: (raw as { vat?: string | null })?.vat || null,
              joinedISO: (raw as { created_at?: string | null })?.created_at || null,
              location: sellerLocation,
            };
            return (
              <SellerPanels
                seller={sellerObj}
                location={sellerObj.location}
                coords={listing.coords ?? null}
                listingId={listing.id}
              />
            );
          })()}
        </div>
      </div>
      {/* Mobile action bar */}
      <div className="md:hidden bg-white border-t shadow-lg mt-8">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">Prijs</div>
              <div className="text-lg font-semibold text-emerald-700">€ {listing.price}</div>
            </div>
            <div className="flex-1">
              <ClientActions
                listingId={listing.id}
                price={listing.price}
                sellerId={listing.seller?.id ?? null}
                sellerKycCompleted={sellerKycCompleted}
                allowOffers={listing.allowOffers}
                min_bid={listing.min_bid}
                stock={listing.stock ?? 1}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Social share panel */}
      <div className="mt-8">
        <SharePanel
          title={listing.title}
          url={`/listings/${listing.id}`}
        />
      </div>
    </div>
  );
}

