"use client";
import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabaseClient';

/**
 * Counts incoming reviews (listing + business) that are newer than last_seen_reviews_at.
 * Strategy:
 * 1. Fetch user & their listings ids.
 * 2. Get profile.last_seen_reviews_at.
 * 3. Fetch opened review ids from review_opens.
 * 4. Unread = total incoming (listing+business) - opened size.
 */
export function useUnreadReviews() {
  const supabase = createClient();
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [localOpened, setLocalOpened] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('ocaso:openedReviews');
        if (raw) {
          setLocalOpened(new Set(JSON.parse(raw)));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    const active = true;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (active) { setTotal(0); setReady(true); } return; }

        type ProfileRow = { id: string; is_business?: boolean | null; last_seen_reviews_at?: string | null };
        const { data: profile } = await supabase
          .from('profiles')
          .select('id,is_business,last_seen_reviews_at')
          .eq('id', user.id)
          .maybeSingle<ProfileRow>();

        const { data: listings } = await supabase.from('listings').select('id').eq('seller_id', user.id).limit(500);
        const listingIds = (listings || []).map((l) => l.id).filter(Boolean) as string[];

        type ReviewLite = { id?: string; created_at?: string | null; listing_id?: string | null; business_id?: string | null };
        const all: ReviewLite[] = [];

        // Use server-side filtering by created_at when last_seen_reviews_at is present
        const lastSeen = profile?.last_seen_reviews_at ?? null;

        if (listingIds.length) {
          if (lastSeen) {
            const { data: listingReviews } = await supabase
              .from('reviews')
              .select('id,created_at,listing_id')
              .in('listing_id', listingIds)
              .gt('created_at', lastSeen)
              .order('created_at', { ascending: false })
              .limit(500);
            if (listingReviews) all.push(...(listingReviews as ReviewLite[]));
          } else {
            const { data: listingReviews } = await supabase
              .from('reviews')
              .select('id,created_at,listing_id')
              .in('listing_id', listingIds)
              .order('created_at', { ascending: false })
              .limit(500);
            if (listingReviews) all.push(...(listingReviews as ReviewLite[]));
          }
        }

        if (profile?.is_business) {
          try {
            if (lastSeen) {
              const { data: bizReviews, error: bizError } = await supabase
                .from('reviews')
                .select('id,created_at,business_id')
                .eq('business_id', user.id)
                .gt('created_at', lastSeen)
                .order('created_at', { ascending: false })
                .limit(500);
              if (bizError) {
                console.warn('[useUnreadReviews] Business reviews query error:', bizError.message);
              } else if (bizReviews) {
                all.push(...(bizReviews as ReviewLite[]));
              }
            } else {
              const { data: bizReviews, error: bizError } = await supabase
                .from('reviews')
                .select('id,created_at,business_id')
                .eq('business_id', user.id)
                .order('created_at', { ascending: false })
                .limit(500);
              if (bizError) {
                console.warn('[useUnreadReviews] Business reviews query error:', bizError.message);
              } else if (bizReviews) {
                all.push(...(bizReviews as ReviewLite[]));
              }
            }
          } catch (e) {
            console.warn('[useUnreadReviews] Error fetching business reviews:', e);
          }
        }

        // Exclude locally opened (optimistic) ids
        const unread = all.filter((r) => r.id && !localOpened.has(r.id)).length;
        if (active) setTotal(unread);
      } catch (e) {
        if (active) setTotal(0);
      } finally {
        if (active) setReady(true);
      }
    }
    load();
    // Re-load when localOpened changes
    return () => {
      // noop cleanup
    };
  }, [supabase, localOpened]);

  // Apply localOpened to calculate total
  const effectiveTotal = total;

  useEffect(() => {
    function onOptimistic(e: Event) {
      const id = (e as CustomEvent).detail?.id;
      if (typeof id === 'string') {
        setLocalOpened(prev => {
          const newSet = new Set(prev);
          newSet.add(id);
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('ocaso:openedReviews', JSON.stringify([...newSet]));
            }
          } catch {
            // Ignore localStorage errors
          }
          return newSet;
        });
      }
    }
    document.addEventListener('ocaso:review-open-optimistic', onOptimistic as EventListener);
    return () => document.removeEventListener('ocaso:review-open-optimistic', onOptimistic as EventListener);
  }, []);

  return { total: effectiveTotal, ready };
}
