import Image from "next/image";

export const dynamic = 'force-dynamic';

import BusinessRatingBadge from "@/components/BusinessRatingBadge";
import BusinessReviewsSection from "@/components/BusinessReviewsSection";
import BusinessSectionNav from "@/components/BusinessSectionNav";
import BusinessStatsLive from "@/components/BusinessStatsLive";
import ListingCard from "../../../components/ListingCard";
import Tooltip from "@/components/Tooltip";
import { supabaseServer } from "@/lib/supabaseServer";

interface ListingRow { id: string; title?: string | null; price?: number | null; images?: string[] | null; created_at?: string | null; views?: number | null; favorites?: number | null; favorites_count?: number | null; category?: string | null; subcategory?: string | null; seller_id?: string | null; status?: string | null }
interface ProfileRow { id: string; full_name?: string | null; display_name?: string | null; shop_name?: string | null; shop_slug?: string | null; business_logo_url?: string | null; business_banner_url?: string | null; business_bio?: string | null; website?: string | null; social_instagram?: string | null; social_facebook?: string | null; social_tiktok?: string | null; public_show_email?: boolean | null; public_show_phone?: boolean | null; address?: { street: string; city: string; zip: string; country: string } | null; invoice_address?: string | null; is_business?: boolean | null; company_name?: string | null; vat?: string | null; registration_nr?: string | null; invoice_email?: string | null; business_plan?: string | null; business_billing_cycle?: string | null; avatar_url?: string | null; stripe_account_id?: string | null }

export default async function BusinessDetailPage({ params }: { params: { id: string } }) {
	const supabase = supabaseServer();
	const rawParam = params.id;
	let businessId = rawParam; // kan id of slug zijn
	// 1. Profiel ophalen: eerst op id, fallback op shop_slug
	let profile: ProfileRow | null = null; let profileError: { message?: string } | null = null;
	{
		const res = await supabase
			.from('profiles')
			.select('id, full_name, display_name, shop_name, shop_slug, business_logo_url, business_banner_url, business_bio, website, social_instagram, social_facebook, social_tiktok, public_show_email, public_show_phone, address, invoice_address, is_business, company_name, vat, registration_nr, invoice_email, business_plan, business_billing_cycle, avatar_url, stripe_account_id')
			.eq('id', businessId)
			.maybeSingle();
		profile = res.data; profileError = res.error;
		if (!profile) {
			// Probeer slug
			const slugRes = await supabase
				.from('profiles')
				.select('id, full_name, display_name, shop_name, shop_slug, business_logo_url, business_banner_url, business_bio, website, social_instagram, social_facebook, social_tiktok, public_show_email, public_show_phone, address, invoice_address, is_business, company_name, vat, registration_nr, invoice_email, business_plan, business_billing_cycle, avatar_url, stripe_account_id')
				.eq('shop_slug', rawParam)
				.maybeSingle();
			if (slugRes.data) {
				profile = slugRes.data; profileError = null; businessId = slugRes.data.id;
			} else if (slugRes.error) {
				profileError = slugRes.error;
			}
		}
	}

	// 1.5 Verificatie check
	let isVerified = false;
	if (profile?.stripe_account_id) {
		try {
			const stripeSecret = process.env.STRIPE_SECRET_KEY;
			if (stripeSecret) {
				const { default: Stripe } = await import('stripe');
				const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
				const account = await stripe.accounts.retrieve(profile.stripe_account_id);
				isVerified = account.details_submitted === true;
			}
		} catch (e) {
			// Ignore verification errors
		}
	}

	// 2. Listings ophalen (enkel seller_id + favorites_count, kolommen favorites / business_id bestaan niet)
	let listings: ListingRow[] | null = null;
	try {
		const q = await supabase
			.from('listings')
			.select('id,title,price,images,created_at,views,favorites_count,status,seller_id')
			.eq('seller_id', businessId)
			.order('created_at', { ascending: false })
			.limit(120);
		listings = q.data as ListingRow[] | null;
		if (listings) {
			listings = listings.map(l => ({
				...l,
				favorites: l.favorites_count != null ? l.favorites_count : 0,
				status: l.status === 'actief' ? 'active' : l.status,
			}));
		}
	} catch (e) {
		/* negeer listings fout voor nu */
	}
	// (Diagnostics code verwijderd)

	// 2. Reviews ophalen: zowel business-level als listing-level (alle listings van deze handelaar)
	interface RawReviewRow { id: string; rating?: number | null; comment?: string | null; created_at?: string | null; listing_id?: string | null; business_id?: string | null; author?: { display_name?: string | null; full_name?: string | null; avatar_url?: string | null } | null }
	let combinedReviews: RawReviewRow[] = [];
	try {
		const listingIds = Array.isArray(listings) ? listings.map(l => l.id).filter(Boolean) : [];
		const reviewSelect = 'id,rating,comment,created_at,listing_id,business_id,author:profiles!reviews_author_id_fkey(display_name,full_name,avatar_url)';
		// Business reviews
		const bizReviews = await supabase
			.from('reviews')
			.select(reviewSelect)
			.eq('business_id', businessId)
			.order('created_at', { ascending: false })
			.limit(200);
		if (bizReviews.data) combinedReviews = combinedReviews.concat(bizReviews.data as RawReviewRow[]);
		// Listing reviews
		if (listingIds.length) {
			const listReviews = await supabase
				.from('reviews')
				.select(reviewSelect)
				.in('listing_id', listingIds)
				.order('created_at', { ascending: false })
				.limit(400);
			if (listReviews.data) combinedReviews = combinedReviews.concat(listReviews.data as RawReviewRow[]);
		}
		// Dedupe on id
		const seen = new Set<string>();
		combinedReviews = combinedReviews.filter(r => {
			if (!r?.id) return false; if (seen.has(r.id)) return false; seen.add(r.id); return true;
		});
	} catch (e) {
		// eslint-disable-next-line no-console
		console.warn('Kon reviews niet volledig laden', e);
	}
	// Map naar vorm voor BusinessReviewsSection
	const reviews = combinedReviews.map(r => ({
		id: r.id,
		rating: Number(r.rating) || 0,
		comment: r.comment ?? null,
		date: r.created_at || undefined,
		author: r.author?.display_name || r.author?.full_name || null,
		authorAvatar: r.author?.avatar_url || null,
	}));

	// Per-listing review aggregaties
	const listingReviewStats = (() => {
		const map = new Map<string, { sum: number; count: number }>();
		for (const r of combinedReviews) {
				const lid = r.listing_id || undefined;
			if (!lid) continue;
			const rating = Number(r.rating) || 0;
			const prev = map.get(lid) || { sum: 0, count: 0 };
			prev.sum += rating; prev.count += 1; map.set(lid, prev);
		}
		return map;
	})();
	if (profileError || !profile) {
		return (
			<div className="container py-16">
				<div className="max-w-lg mx-auto text-center space-y-4">
					<div className="text-2xl font-semibold text-gray-800">Profiel niet gevonden</div>
					<p className="text-sm text-gray-500">ID/Slug: {rawParam}</p>
					<p className="text-sm text-red-600">{profileError?.message}</p>
					<a href="/explore" className="btn btn-sm inline-block">Terug naar overzicht</a>
				</div>
			</div>
		);
	}
	const displayName = profile.shop_name || profile.display_name || profile.full_name;
	const avgRating = (reviews && reviews.length) ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : 0;
	// Debug weergave verwijderd
	return (
		<div className="min-h-screen flex flex-col">
			<header className="relative py-4 md:py-6">
				<div className="container">
					<div className="relative h-[220px] md:h-[260px] w-full overflow-hidden rounded-2xl md:rounded-3xl border bg-neutral-100 shadow-sm">
						<Image
							src={profile.business_banner_url || '/placeholder.png'}
							alt="Banner"
							fill
							priority
							className="object-cover"
						/>
					</div>
				</div>
			</header>
			<main className="container flex-1 pt-2 md:pt-4 pb-10 md:pb-12 grid gap-12 lg:grid-cols-12">
				<div className="lg:col-span-8 space-y-8">
					{/* Profiel kop */}
					<section id="shop-profiel" className="space-y-3">
						<div className="flex flex-col md:flex-row md:items-start gap-4">
							<div className="flex items-start gap-4">
								<div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-2 ring-white shadow bg-white border flex-shrink-0">
									<Image src={profile.business_logo_url || profile.avatar_url || '/placeholder.png'} alt={displayName || 'Logo'} fill className="object-cover" />
								</div>
								<div className="space-y-2 min-w-0 flex-1">
									<div className="flex flex-col gap-2">
										<h1 className="text-3xl font-bold tracking-tight text-gray-900">{displayName}</h1>
										<div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
											{profile.company_name && <span className="font-medium">{profile.company_name}</span>}
											{profile.vat && <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-sm border border-emerald-100">BTW: {profile.vat}</span>}
											{avgRating > 0 && (<BusinessRatingBadge initialAvg={avgRating} initialCount={reviews.length} />)}
										</div>
										{isVerified && <Tooltip content="Geverifieerde gebruiker en ondersteunt betaling via een eigen betaalterminal"><span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium shadow-sm w-fit cursor-help">Vertrouwd</span></Tooltip>}
									</div>
									<div className="flex flex-wrap gap-2 text-sm">
										{profile.website && <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-emerald-50 transition" href={profile.website} target="_blank" rel="noopener">Website</a>}
										{profile.social_instagram && <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-pink-50 transition" href={profile.social_instagram} target="_blank" rel="noopener">Instagram</a>}
										{profile.social_facebook && <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-blue-50 transition" href={profile.social_facebook} target="_blank" rel="noopener">Facebook</a>}
										{profile.social_tiktok && <a className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border text-gray-700 hover:bg-gray-100 transition" href={profile.social_tiktok} target="_blank" rel="noopener">TikTok</a>}
									</div>
								</div>
							</div>
							<div className="flex md:flex-col gap-4 md:items-end">
								<div className="rounded-lg bg-white border shadow-sm px-4 py-3 flex items-center gap-3">
									<div>
										<div className="text-sm text-gray-500">Zoekertjes</div>
										<div className="text-lg font-semibold">{Array.isArray(listings) ? listings.length : 0}</div>
									</div>
								</div>
							</div>
						</div>
						<hr className="border-gray-200" />
					</section>
					<BusinessSectionNav />
					{/* Over deze handelaar */}
					{profile.business_bio && (
						<section id="over" className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-800">Over deze handelaar</h2>
							<div className="prose max-w-none text-sm leading-relaxed text-gray-700 bg-white rounded-xl border p-5 shadow-sm">
								{profile.business_bio}
							</div>
						</section>
					)}

					{/* Aanbod */}
					<section id="aanbod" className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold">Aanbod</h2>
							{Array.isArray(listings) && listings.length > 0 && (
								<span className="text-sm px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{listings.length} actief</span>
							)}
						</div>
						{Array.isArray(listings) && listings.length > 0 && (
							<ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
								{listings.map((l: ListingRow) => {
									if (!l) return null;
									const stats = listingReviewStats.get(l.id);
									const avg = stats ? stats.sum / stats.count : undefined;
									const normalized: ListingRow = { ...l, title: l.title || '' };
									return <li key={normalized.id}><ListingCard compact listing={normalized as any} reviewAvg={avg} reviewCount={stats?.count} />{/* eslint-disable-line @typescript-eslint/no-explicit-any */}</li>;
								})}
							</ul>
						)}
						{Array.isArray(listings) && listings.length > 0 && (
							<div className="pt-2">
								<a href={`/business/${businessId}/aanbod`}
									className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border bg-white hover:bg-emerald-50 text-emerald-700 transition">
									Bekijk volledig aanbod
								</a>
							</div>
						)}
						{/* Debug JSON blok verwijderd */}
					</section>

					{/* Reviews */}
					<section id="reviews" className="space-y-4">
						<h2 className="text-xl font-semibold">Reviews</h2>
						<div className="card p-0">
									{/* Render reviews section always so users can place a review even when none exist yet */}
									<BusinessReviewsSection businessId={profile.id} reviews={reviews} rating={avgRating} reviewCount={reviews.length} />
						</div>
					</section>
				</div>
				<aside className="lg:col-span-4 space-y-8 lg:pl-4 xl:pl-6">
					<div className="sticky top-28 space-y-8">
						<section id="statistieken" className="space-y-3">
							<h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Statistieken</h2>
							<div className="card p-5">
							<BusinessStatsLive businessId={profile.id} initial={{ totalListings: listings?.length }} />
						</div>
					</section>
						<section id="contact" className="space-y-3">
							<h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact</h2>
							<div className="card p-5 text-sm text-gray-600 space-y-2">
							{profile.public_show_email && profile.invoice_email && (
								<div>
									<div className="text-sm text-gray-400">E-mail</div>
									<a href={`mailto:${profile.invoice_email}`} className="text-emerald-700 hover:underline break-all">{profile.invoice_email}</a>
								</div>
							)}
							{profile.public_show_phone && profile.address && (
								<div>
									<div className="text-sm text-gray-400">Adres</div>
									<div className="whitespace-pre-line">
										{typeof profile.address === 'object' && profile.address
											? `${profile.address.street || ''} ${profile.address.zip || ''} ${profile.address.city || ''}, ${profile.address.country || ''}`.trim()
											: profile.address || ''}
									</div>
								</div>
							)}
							{(!profile.public_show_email && !profile.public_show_phone) && (
								<div className="text-sm text-gray-400">Contactgegevens afgeschermd</div>
							)}
						</div>
					</section>
					</div>
				</aside>
			</main>
		</div>
	);
}
