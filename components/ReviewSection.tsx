"use client";
import { useEffect, useState } from "react";

import Avatar from "@/components/Avatar";

export type Review = {
  id: string;
  reviewer: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  created_at: string;
};

export default function ReviewSection({ listingId }: { listingId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews?listing_id=${listingId}`)
      .then(res => res.json())
      .then(data => setReviews(data.items ?? []))
      .finally(() => setLoading(false));
  }, [listingId]);

  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, rating, comment }),
    });
    if (res.ok) {
      const newReview = await res.json();
      setReviews([newReview, ...reviews]);
      setComment("");
      setRating(5);
    } else {
      setError("Review kon niet worden opgeslagen.");
    }
    setSubmitting(false);
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Reviews</h2>
      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm">Jouw beoordeling:</label>
          {[1,2,3,4,5].map(n => (
            <button type="button" key={n} onClick={() => setRating(n)} className={n <= rating ? "text-yellow-500" : "text-gray-300"} aria-label={`Geef ${n} sterren`}>
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full border rounded p-2 text-sm"
          rows={3}
          placeholder="Schrijf een review..."
          required
        />
        <button type="submit" disabled={submitting || !comment} className="btn btn-primary">
          {submitting ? "Verzenden..." : "Review plaatsen"}
        </button>
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      </form>
      {loading ? (
        <div className="text-gray-500">Reviews laden...</div>
      ) : reviews.length === 0 ? (
        <div className="text-gray-500">Nog geen reviews voor dit zoekertje.</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border rounded-xl p-4 bg-gray-50 flex gap-4 items-start">
              <Avatar src={r.reviewerAvatar} name={r.reviewer} size={40} rounded="full" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.reviewer}</span>
                  <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span className="text-sm text-gray-400 ml-2">{new Date(r.created_at).toLocaleDateString("nl-BE")}</span>
                </div>
                <div className="mt-1 text-gray-700 text-sm">{r.comment}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
