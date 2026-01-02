import type { SupabaseClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import Avatar from "@/components/Avatar";
import BusinessReviewsSection from "@/components/BusinessReviewsSection";
import ListingCard from "@/components/ListingCard";
import RatingStars from "@/components/RatingStars";
import SellerSectionNav from "@/components/SellerSectionNav";
import { formatPrice } from "@/lib/formatPrice";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  reviewer: string | null;
  reviewerAvatar: string | null;
  listingTitle?: string | null;
}

interface PublicProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  isBusiness: boolean;
  shopName: string | null;
  shopSlug: string | null;
  companyName: string | null;
  vat: string | null;
  website: string | null;
  businessBio: string | null;
  businessLogoUrl: string | null;
  businessBannerUrl: string | null;
  socialInstagram: string | null;
  socialFacebook: string | null;
  socialTiktok: string | null;
  joinedISO: string | null;
  rating: number | null;
  reviewsCount: number;
  address?: {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
  } | null;
}

async function fetchProfile(id: string): Promise<{ data: PublicProfile | null; error?: Error; reviews?: Review[]; listings?: any[] }> {
  const supabase = supabaseServer();
  
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, first_name, last_name, avatar_url, is_business, shop_name, shop_slug, company_name, vat, website, business_bio, business_logo_url, business_banner_url, social_instagram, social_facebook, social_tiktok, created_at, address")
      .eq("id", id)
      .maybeSingle();
      
    if (error) {
      console.error("[Seller Profile] Fetch error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        id,
        isRLSError: error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy'),
      });
      
      if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy')) {
        console.error("[Seller Profile] RLS POLICY ERROR - Profile may not be accessible to anonymous users");
        console.error("[Seller Profile] Check that profiles_select_public policy exists and allows SELECT for 'public' role");
      }
      
      return { data: null, error: new Error(error.message || "Failed to fetch profile") };
    }
    
    if (!data) {
      console.warn("[Seller Profile] No profile found for id:", id);
      return { data: null };
    }

    const firstName = data.first_name || (data.full_name ? data.full_name.trim().split(" ")[0] : "") || "";
    const lastName = data.last_name || (data.full_name && data.full_name.trim().split(" ").length > 1 
      ? data.full_name.trim().split(" ").slice(1).join(" ") 
      : "") || "";
    const displayName = data.display_name || data.full_name || `${firstName} ${lastName}`.trim() || "Onbekende gebruiker";
    
    // Haal listings op
    const { data: sellerListings } = await supabase
      .from("listings")
      .select("id, title, price, images, created_at, views, favorites_count, status, seller_id")
      .eq("seller_id", data.id)
      .order("created_at", { ascending: false })
      .limit(120);
    
    const listings = (sellerListings || []).map(l => ({
      ...l,
      favorites: l.favorites_count != null ? l.favorites_count : 0,
      status: l.status === 'actief' ? 'active' : l.status,
    }));
    
    const listingIds = listings.map(l => l.id).filter(Boolean);
    const listingTitles = new Map(
      listings
        .filter(l => l.id && l.title)
        .map(l => [l.id, l.title])
    );
    
    // Haal reviews op met volledige informatie
    let rating: number | null = null;
    let reviewsCount = 0;
    let reviews: Review[] = [];
    
    try {
      // Business reviews
      const { data: businessReviewsData } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, listing_id, business_id, author_id")
        .eq("business_id", data.id)
        .order("created_at", { ascending: false })
        .limit(200);
      
      // Listing reviews
      let listingReviewsData: any[] = [];
      if (listingIds.length > 0) {
        const { data: listingReviews } = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at, listing_id, business_id, author_id")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false })
          .limit(400);
        listingReviewsData = listingReviews || [];
      }
      
      // Combineer en dedupliceer reviews
      const allReviewsRaw = [
        ...(businessReviewsData || []),
        ...listingReviewsData
      ];
      
      const seen = new Set<string>();
      const uniqueReviews = allReviewsRaw.filter(r => {
        if (!r?.id || seen.has(String(r.id))) return false;
        seen.add(String(r.id));
        return true;
      });
      
      // Haal reviewer informatie op
      const authorIds = [...new Set(uniqueReviews.map(r => r.author_id).filter(Boolean))];
      const reviewerMap = new Map<string, { full_name?: string | null; display_name?: string | null; avatar_url?: string | null }>();
      
      if (authorIds.length > 0) {
        const { data: reviewers } = await supabase
          .from("profiles")
          .select("id, full_name, display_name, avatar_url")
          .in("id", authorIds);
        
        reviewers?.forEach(profile => {
          reviewerMap.set(profile.id, {
            full_name: profile.full_name,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          });
        });
      }
      
      // Map naar Review interface
      reviews = uniqueReviews.map(r => {
        const reviewer = reviewerMap.get(r.author_id) || {};
        const reviewerName = reviewer.display_name || reviewer.full_name || "Anonieme koper";
        const reviewerAvatar = reviewer.avatar_url || null;
        const listingTitle = r.listing_id ? listingTitles.get(r.listing_id) || null : null;
        
        return {
          id: String(r.id),
          rating: typeof r.rating === 'number' ? r.rating : 0,
          comment: r.comment || null,
          created_at: r.created_at || null,
          reviewer: reviewerName,
          reviewerAvatar: reviewerAvatar,
          listingTitle: listingTitle,
        };
      });
      
      if (reviews.length > 0) {
        reviewsCount = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        rating = sum / reviewsCount;
      }
    } catch (reviewError) {
      console.warn("[Seller Profile] Could not fetch reviews:", reviewError);
    }
    
    const profile: PublicProfile = {
      id: data.id,
      fullName: displayName,
      firstName: firstName || displayName || "",
      lastName: lastName || "",
      avatarUrl: data.avatar_url || "/placeholder.png",
      isBusiness: !!data.is_business,
      shopName: data.shop_name || null,
      shopSlug: data.shop_slug || null,
      companyName: data.company_name || null,
      vat: data.vat || null,
      website: data.website || null,
      businessBio: data.business_bio || null,
      businessLogoUrl: data.business_logo_url || null,
      businessBannerUrl: data.business_banner_url || null,
      socialInstagram: data.social_instagram || null,
      socialFacebook: data.social_facebook || null,
      socialTiktok: data.social_tiktok || null,
      joinedISO: data.created_at || null,
      rating: rating,
      reviewsCount: reviewsCount,
      address: data.address as PublicProfile['address'] || null,
    };
    
    return { data: profile, reviews: reviews, listings: listings };
  } catch (err) {
    console.error("[Seller Profile] Unexpected error:", err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error("Unexpected error fetching profile") 
    };
  }
}

function formatJoined(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-BE", { year: "numeric", month: "long" });
  } catch {
    return "—";
  }
}

export default async function PublicSellerProfile({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = supabaseServer();
  
  console.log("[Seller Profile] Looking for profile with ID/slug:", id);
  
  // Test query: Check of we überhaupt profielen kunnen lezen (RLS test)
  const { data: testData, error: testError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);
  
  if (testError) {
    console.error("[Seller Profile] RLS TEST FAILED - Cannot read profiles:", {
      error: testError.message,
      code: testError.code,
      details: testError.details,
      hint: testError.hint,
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/60 via-white to-white">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Toegang Geweigerd</h1>
          <p className="text-gray-600">
            Profielen zijn momenteel niet toegankelijk voor bezoekers. Dit is waarschijnlijk een RLS (Row Level Security) policy probleem.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Technische details:</p>
            <p className="text-gray-700">Error: {testError.message}</p>
            <p className="text-gray-600 mt-2">Code: {testError.code || 'N/A'}</p>
          </div>
          <Link href="/explore" className="inline-block rounded-full bg-emerald-600 text-white px-6 py-2 text-sm font-semibold hover:bg-emerald-700 transition">
            Terug naar overzicht
          </Link>
        </div>
      </div>
    );
  }
  
  console.log("[Seller Profile] RLS test passed - can read profiles. Found", testData?.length || 0, "profiles");
  
  // Probeer eerst op ID te zoeken
  let profileData = await fetchProfile(id);
  
  // Als niet gevonden op ID, probeer op shop_slug
  if (!profileData.data) {
    console.log("[Seller Profile] Not found by ID, trying shop_slug...");
    const { data: slugData, error: slugError } = await supabase
      .from("profiles")
      .select("id")
      .eq("shop_slug", id)
      .maybeSingle();
    
    if (slugError) {
      console.error("[Seller Profile] Slug lookup error:", slugError);
    }
    
    if (slugData?.id) {
      console.log("[Seller Profile] Found by slug, fetching profile:", slugData.id);
      profileData = await fetchProfile(slugData.id);
    } else {
      console.log("[Seller Profile] Not found by slug either");
    }
  }
  
  const { data, error, reviews = [], listings = [] } = profileData;
  
  if (error) {
    console.error("[Seller Profile] Final error:", error.message);
  }
  
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/60 via-white to-white">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Profiel niet gevonden</h1>
          <p className="text-gray-600">
            Het gevraagde profiel bestaat niet of is niet beschikbaar.
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left text-sm">
              <p className="font-semibold mb-2 text-red-800">Error details:</p>
              <p className="text-red-700">{error.message}</p>
            </div>
          )}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left text-xs text-gray-600">
            <p>Gezochte ID/slug: <code className="bg-gray-200 px-1 rounded">{id}</code></p>
          </div>
          <Link href="/explore" className="inline-block rounded-full bg-emerald-600 text-white px-6 py-2 text-sm font-semibold hover:bg-emerald-700 transition">
            Terug naar overzicht
          </Link>
        </div>
      </div>
    );
  }
  
  // Als het een business is met een shop_slug, redirect naar business pagina
  if (data.isBusiness && data.shopSlug) {
    redirect(`/business/${data.shopSlug}`);
  }

  const displayName = data.shopName || data.companyName || data.fullName;
  const logoUrl = data.businessLogoUrl || data.avatarUrl;
  const bannerUrl = data.businessBannerUrl;
  const avgRating = data.rating || 0;

  // Map reviews naar formaat voor BusinessReviewsSection
  const reviewsForSection = reviews.map(r => ({
    id: r.id,
    author: r.reviewer,
    authorAvatar: r.reviewerAvatar,
    rating: r.rating,
    comment: r.comment || undefined,
    date: r.created_at || undefined,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header met banner */}
      {bannerUrl && (
        <header className="relative py-4 md:py-6">
          <div className="container">
            <div className="relative h-[220px] md:h-[260px] w-full overflow-hidden rounded-2xl md:rounded-3xl border bg-neutral-100 shadow-sm">
              <Image
                src={bannerUrl}
                alt="Banner"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>
        </header>
      )}

      <main className="container flex-1 pt-2 md:pt-4 pb-10 md:pb-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          {/* Profiel kop */}
          <section id="seller-profiel" className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-2 ring-white shadow bg-white border flex-shrink-0">
                  <Avatar src={logoUrl} name={displayName} size={bannerUrl ? 96 : 128} rounded="full" />
                </div>
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{displayName}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      {data.companyName && data.companyName !== displayName && (
                        <span className="font-medium">{data.companyName}</span>
                      )}
                      {data.vat && (
                        <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-sm border border-emerald-100">
                          BTW: {data.vat}
                        </span>
                      )}
                      {data.rating != null && data.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <RatingStars rating={data.rating} size={14} />
                          <span className="font-medium">{data.rating.toFixed(1)}</span>
                          <span className="text-gray-500">({reviews.length})</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Lid sinds {formatJoined(data.joinedISO)}</p>
                  </div>
                  {(data.website || data.socialInstagram || data.socialFacebook || data.socialTiktok) && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      {data.website && (
                        <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-emerald-50 transition" href={data.website} target="_blank" rel="noopener">
                          Website
                        </a>
                      )}
                      {data.socialInstagram && (
                        <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-pink-50 transition" href={data.socialInstagram} target="_blank" rel="noopener">
                          Instagram
                        </a>
                      )}
                      {data.socialFacebook && (
                        <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-blue-50 transition" href={data.socialFacebook} target="_blank" rel="noopener">
                          Facebook
                        </a>
                      )}
                      {data.socialTiktok && (
                        <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-gray-100 transition" href={data.socialTiktok} target="_blank" rel="noopener">
                          TikTok
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex md:flex-col gap-4 md:items-end">
                <div className="rounded-lg bg-white border shadow-sm px-4 py-3 flex items-center gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Zoekertjes</div>
                    <div className="text-lg font-semibold">{listings.length}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/search?seller=${data.id}`} className="inline-flex items-center justify-center rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-800 transition">
                    Alle zoekertjes
                  </Link>
                  <Link href={`/messages/new?to=${data.id}`} className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 transition">
                    Contacteer
                  </Link>
                </div>
              </div>
            </div>
            <hr className="border-gray-200" />
          </section>

          {/* Section Navigation */}
          <SellerSectionNav />

          {/* Over deze verkoper */}
          {(data.businessBio || data.address) && (
            <section id="over" className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Over deze verkoper</h2>
              {data.businessBio && (
                <div className="prose max-w-none text-sm leading-relaxed text-gray-700 bg-white rounded-xl border p-5 shadow-sm">
                  {data.businessBio}
                </div>
              )}
              {data.address && (data.address.street || data.address.city) && (
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Locatie</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {data.address.street && <p>{data.address.street}</p>}
                    {(data.address.zip || data.address.city) && (
                      <p>{[data.address.zip, data.address.city].filter(Boolean).join(' ')}</p>
                    )}
                    {data.address.country && data.address.country !== 'België' && (
                      <p>{data.address.country}</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Aanbod */}
          <section id="aanbod" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Aanbod</h2>
              {listings.length > 0 && (
                <span className="text-sm px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {listings.length} actief
                </span>
              )}
            </div>
            {listings.length > 0 ? (
              <>
                <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
                  {listings.slice(0, 20).map((listing: any) => (
                    <li key={listing.id}>
                      <ListingCard listing={listing} compact />
                    </li>
                  ))}
                </ul>
                {listings.length > 20 && (
                  <div className="pt-2">
                    <Link
                      href={`/search?seller=${data.id}`}
                      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border bg-white hover:bg-emerald-50 text-emerald-700 transition"
                    >
                      Bekijk volledig aanbod ({listings.length} zoekertjes)
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-8 text-center">
                <p className="text-gray-500">Nog geen zoekertjes geplaatst.</p>
              </div>
            )}
          </section>

          {/* Reviews */}
          <section id="reviews" className="space-y-4">
            <h2 className="text-xl font-semibold">Reviews</h2>
            <div className="card p-0">
              <BusinessReviewsSection 
                businessId={data.id} 
                reviews={reviewsForSection} 
                rating={avgRating} 
                reviewCount={reviews.length}
                hideCreate={true}
              />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8 lg:pl-4 xl:pl-6">
          <div className="sticky top-28 space-y-8">
            {/* Statistieken */}
            <section id="statistieken" className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Statistieken</h2>
              <div className="card p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-semibold">{listings.length}</div>
                    <div className="mt-1 text-sm text-gray-600">Zoekertjes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{reviews.length}</div>
                    <div className="mt-1 text-sm text-gray-600">Reviews</div>
                  </div>
                  {data.rating != null && data.rating > 0 && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <RatingStars rating={data.rating} size={18} />
                        <span className="text-xl font-semibold">{data.rating.toFixed(1)}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">Gemiddelde beoordeling</div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Contact */}
            <section id="contact" className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact</h2>
              <div className="card p-5 text-sm text-gray-600 space-y-3">
                <Link
                  href={`/messages/new?to=${data.id}`}
                  className="block w-full text-center rounded-lg bg-emerald-600 text-white px-4 py-2 font-semibold hover:bg-emerald-700 transition"
                >
                  Bericht sturen
                </Link>
                <Link
                  href={`/search?seller=${data.id}`}
                  className="block w-full text-center rounded-lg border border-gray-300 bg-white text-gray-700 px-4 py-2 font-medium hover:bg-gray-50 transition"
                >
                  Bekijk alle zoekertjes
                </Link>
              </div>
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}
