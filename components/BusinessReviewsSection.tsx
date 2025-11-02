"use client";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "../lib/supabaseClient";
import LoginPrompt from "./LoginPrompt";
import RatingStars from "./RatingStars";
import ReviewModal from "./ReviewModal";

type Review = {
  id: string;
  author?: string | null;
  authorAvatar?: string | null;
  rating: number;
  comment?: string | null;
  date?: string;
};

export default function BusinessReviewsSection({ businessId, reviews: initialReviews, rating, reviewCount, hideCreate = false }: { businessId: string; reviews: Review[]; rating: number; reviewCount: number; hideCreate?: boolean; }) {
  const [showModal, setShowModal] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Review | null>(null);
  const [sort, setSort] = useState<"relevant"|"newest"|"oldest"|"highest"|"lowest">("relevant");
  const [avg, setAvg] = useState<number>(rating);
  const [count, setCount] = useState<number>(reviewCount);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Sync when parent provides new data (e.g. after fetch in profile tab)
  useEffect(() => {
    setReviews(initialReviews ?? []);
  }, [initialReviews]);
  useEffect(() => { setAvg(rating); }, [rating]);
  useEffect(() => { setCount(reviewCount); }, [reviewCount]);
  // Load opened state best-effort (no blocking UI)
  useEffect(() => {
    // Placeholder for potential batch opened-state fetch (not implemented yet)
  }, [reviews]);

  async function markOpened(id: string, review?: Review) {
    if (review) setSelected(review);
    // fire optimistic per-review event
    window.dispatchEvent(new CustomEvent('ocaso:review-open-optimistic', { detail: { id } }));
    if (opened.has(id)) {
      window.dispatchEvent(new CustomEvent('ocaso:reviews-open-changed'));
      return;
    }
    setOpened(prev => new Set(prev).add(id));
    window.dispatchEvent(new CustomEvent('ocaso:reviews-open-changed'));
    try {
      const res = await fetch(`/api/reviews/${id}/open`, { method: 'POST' });
      if (!res.ok) {
        console.debug('Failed to mark review as opened:', res.status, id);
      }
      // Update last_seen_reviews_at naar huidige tijd wanneer een review wordt geopend
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const now = new Date().toISOString();
        await supabase.from('profiles').update({ last_seen_reviews_at: now }).eq('id', user.id);
      }
    } catch (error) {
      console.debug('Error marking review as opened:', error);
    }
  }

  function handleAddReview(incoming: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Normaliseer veldnamen vanuit API (/api/reviews) naar lokale Review shape
    const mapped: Review & { ratingAvg?: number; reviewCount?: number } = {
      id: incoming.id,
      rating: Number(incoming.rating) || 0,
      comment: incoming.comment ?? null,
      author: incoming.author || incoming.reviewer || null,
      authorAvatar: incoming.authorAvatar || incoming.reviewerAvatar || null,
      date: incoming.date || incoming.created_at || new Date().toISOString(),
      ratingAvg: incoming.ratingAvg,
      reviewCount: incoming.reviewCount,
    };
    setReviews([mapped, ...reviews]);
    if (typeof mapped.ratingAvg === "number") setAvg(mapped.ratingAvg);
    else {
      // fallback naive recalc
      const sum = [mapped, ...reviews].reduce((s, r) => s + (r.rating || 0), 0);
      setAvg(sum / (reviews.length + 1));
    }
    if (typeof mapped.reviewCount === "number") setCount(mapped.reviewCount);
    else setCount(count + 1);
  }

  const sorted = useMemo(() => {
    const arr = [...reviews];
    switch (sort) {
      case "newest":
        return arr.sort((a,b) => (new Date(b.date||0).getTime()) - (new Date(a.date||0).getTime()));
      case "oldest":
        return arr.sort((a,b) => (new Date(a.date||0).getTime()) - (new Date(b.date||0).getTime()));
      case "highest":
        return arr.sort((a,b) => b.rating - a.rating);
      case "lowest":
        return arr.sort((a,b) => a.rating - b.rating);
      case "relevant":
      default:
        return arr.sort((a,b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return (new Date(b.date||0).getTime()) - (new Date(a.date||0).getTime());
        });
    }
  }, [reviews, sort]);

  return (
    <>
    <div className="card p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-semibold text-lg" id="business-reviews-heading">Reviews</h2>
          <div
            className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
            aria-labelledby="business-reviews-heading"
            aria-label={`Gemiddelde beoordeling ${avg.toFixed(1)} uit 5 op basis van ${count} review${count===1?'':'s'}`}
            role="group"
          >
            <RatingStars rating={avg} />
            <span className="font-semibold tabular-nums">{avg.toFixed(1)}</span>
            <span className="text-gray-400">/5</span>
            <span className="ml-2 text-sm text-gray-500">{count} review{count===1?'':'s'}</span>
          </div>
        </div>
  <div className="flex items-center gap-3">
          <label htmlFor="reviewSort" className="text-sm text-gray-500 font-medium hidden sm:block">Sortering</label>
          <select
            id="reviewSort"
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="text-sm sm:text-sm border rounded-md px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="relevant">Relevant</option>
            <option value="newest">Nieuwste</option>
            <option value="oldest">Oudste</option>
            <option value="highest">Hoogste rating</option>
            <option value="lowest">Laagste rating</option>
          </select>
          {!hideCreate && (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-primary text-black px-5 py-2 text-sm font-semibold border border-primary/30 shadow hover:bg-primary/80 transition"
              onClick={async () => {
                try {
                  const supabase = createClient();
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session?.user) {
                    setShowModal(false);
                    // show login prompt instead
                    setShowLoginPrompt(true);
                    return;
                  }
                  setShowModal(true);
                } catch {
                  setShowLoginPrompt(true);
                }
              }}
            >
              <span>Review plaatsen</span>
            </button>
          )}
        </div>
      </div>

      {reviews.length === 0 && (
        <div className="text-gray-600 text-sm border border-dashed rounded-lg p-6 text-center">
          Nog geen reviews. Wees de eerste om een beoordeling te schrijven.
        </div>
      )}

      <div className="max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <ul className="space-y-4">
          {sorted.map((r, idx) => (
            <li
              key={r.id}
              onClick={() => markOpened(r.id, r)}
              className={`group cursor-pointer rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm p-4 hover:shadow-sm transition ${idx >= 5 ? 'opacity-90' : ''} ${opened.has(r.id) ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/70 to-primary/40 flex items-center justify-center text-sm font-semibold text-black ring-2 ring-white overflow-hidden">
                  {r.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.authorAvatar} alt={r.author || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    (r.author?.[0] || 'U')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-sm">{r.author || 'Anonieme koper'}</span>
                    <span className="inline-flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <RatingStars rating={r.rating} />
                      <span className="font-medium leading-none">{r.rating.toFixed(1)}</span>
                    </span>
                    {r.date && (
                      <span className="text-sm text-gray-400">{formatDate(r.date)}</span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {r.comment}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
  {!hideCreate && showModal && (
        <ReviewModal
          isBusiness
          listingId={businessId}
          onClose={() => setShowModal(false)}
          onReview={(review: unknown) => handleAddReview(review as Review & { ratingAvg?: number; reviewCount?: number })}
        />
      )}
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
    {selected && (
      <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Review details">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
        <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-6 animate-in fade-in zoom-in">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="Sluiten"
          >✕</button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/70 to-primary/40 flex items-center justify-center text-sm font-semibold text-black ring-2 ring-white overflow-hidden">
              {selected.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.authorAvatar} alt={selected.author || 'Avatar'} className="w-full h-full object-cover" />
              ) : (
                (selected.author?.[0] || 'U')
              )}
            </div>
            <div>
              <div className="font-medium text-sm">{selected.author || 'Anonieme koper'}</div>
              {selected.date && <div className="text-sm text-gray-400">{formatDate(selected.date)}</div>}
            </div>
            <span className="ml-auto inline-flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <RatingStars rating={selected.rating} />
              <span className="font-medium leading-none">{selected.rating.toFixed(1)}</span>
            </span>
          </div>
          {selected.comment && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-4">
              {selected.comment}
            </p>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => setSelected(null)}
              className="rounded-md bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-500"
            >Sluiten</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

    function formatDate(d: string) {
      try {
        const date = new Date(d);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        // Consistent formaat dd-mm-jjjj voor zowel server als client (voorkomt hydration mismatch)
        return `${day}-${m}-${y}`;
      } catch {
        return d;
      }
    }