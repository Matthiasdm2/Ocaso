'use client';

import { useEffect, useState } from 'react';

import BusinessReviewsSection from '@/components/BusinessReviewsSection';
import { createClient } from '@/lib/supabaseClient';

interface ReviewRow {
  id: string;
  rating: number;
  comment?: string | null;
  created_at?: string | null;
  listing_id?: string | null;
  author_id?: string | null;
  listing_title?: string | null;
  author?: string | null;
  authorAvatar?: string | null;
  business_id?: string | null;
}

export default function ReviewsTabPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Je bent niet ingelogd.');
          setLoading(false);
          return;
        }
        // 1) Haal al jouw listing ids op (je bent de seller => listings.seller_id = user.id)
        const { data: myListings, error: listErr } = await supabase
          .from('listings')
          .select('id')
          .eq('seller_id', user.id)
          .limit(500);
        if (listErr) throw listErr;
        const listingIds = (myListings || []).map(l => l.id).filter(Boolean);
        // Business id fallback (indien profiel business is en reviews via business_id zijn opgeslagen)
        // Probeer altijd business reviews op te halen indien ze bestaan (ook als profiel niet expliciet business is gemarkeerd)
        let businessId: string | null = null;
        try {
          const { data: prof } = await supabase.from('profiles').select('id,is_business').eq('id', user.id).maybeSingle();
          if (prof) businessId = user.id; // fallback: altijd eigen id gebruiken; filters later verwijderen als leeg
        } catch { /* ignore */ }

  if (!listingIds.length && !businessId) {
          setItems([]); setAvg(0); setCount(0); setLoading(false); return;
        }
        // 2) Reviews: combineer listing reviews + (optioneel) business reviews (sequentieel voor eenvoud)
  interface RawReview { id?: string; rating?: number | null; comment?: string | null; created_at?: string | null; listing_id?: string | null; author_id?: string | null; listings?: { title?: string | null } | null; author?: { display_name?: string | null; full_name?: string | null; avatar_url?: string | null } | null; business_id?: string | null; }
        let collected: RawReview[] = [];
        if (listingIds.length) {
          const resListings = await supabase
            .from('reviews')
            .select('id,rating,comment,created_at,listing_id,author_id,business_id,author:profiles!reviews_author_id_fkey(display_name,full_name,avatar_url),listings(title)')
            .in('listing_id', listingIds)
            .order('created_at', { ascending: false })
            .limit(500);
          if (resListings.error) throw resListings.error;
          collected = collected.concat(resListings.data as RawReview[] || []);
        }
  if (businessId) {
          const resBiz = await supabase
            .from('reviews')
            .select('id,rating,comment,created_at,listing_id,author_id,business_id,author:profiles!reviews_author_id_fkey(display_name,full_name,avatar_url),listings(title)')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(500);
          if (resBiz.error) throw resBiz.error;
          collected = collected.concat(resBiz.data as RawReview[] || []);
        }
        const seen = new Set<string>();
        const data = collected.filter(r => { if (!r.id) return false; if (seen.has(r.id)) return false; seen.add(r.id); return true; });
        const rows: ReviewRow[] = (data as RawReview[] | null | undefined || []).map(r => ({
          id: r.id || crypto.randomUUID(),
          rating: Number(r.rating) || 0,
          comment: r.comment ?? null,
          created_at: r.created_at ?? null,
          listing_id: r.listing_id ?? null,
          author_id: r.author_id ?? null,
          business_id: r.business_id ?? null,
          listing_title: r.listings?.title || null,
          author: r.author?.display_name || r.author?.full_name || null,
          authorAvatar: r.author?.avatar_url || null,
        }));
        // Debug info
        // eslint-disable-next-line no-console
  console.log('[Profile Reviews] listingIds=%d businessId=%s fetched=%d collected=%d listingIds=%o', listingIds.length, businessId, rows.length, collected.length, listingIds);
  // Extra debug: toon alle ids
  console.log('[Profile Reviews] Row IDs:', rows.map(r=>r.id));
        setItems(rows);
        if (rows.length) {
          const total = rows.reduce((s,r)=>s + (r.rating||0),0);
          setCount(rows.length);
          setAvg(total / rows.length);
        } else {
          setCount(0); setAvg(0);
        }
      } catch (e) {
        console.error(e);
        setError('Kon reviews niet laden.');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) return <div className="text-sm text-neutral-600">Laden…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  // Hergebruik BusinessReviewsSection voor consistente UI. We geven businessId = 'self' (placeholder).
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Mijn reviews</h2>
  <div className="mb-2 text-xs text-neutral-400">Debug: {count} reviews gevonden. Gemiddelde {avg.toFixed(2)}.</div>
  <BusinessReviewsSection
        businessId="self"
        hideCreate
        reviews={items.map(r => ({
          id: r.id,
          author: r.author,
          authorAvatar: r.authorAvatar || undefined,
          rating: r.rating,
          comment: r.comment || undefined,
          date: r.created_at || undefined,
        }))}
        rating={avg}
        reviewCount={count}
      />
    </div>
  );
}
