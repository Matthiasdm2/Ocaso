/* eslint-disable simple-import-sort/imports */
"use client";
import { useRef, useState } from "react";
import { createClient } from "../lib/supabaseClient";

export default function ReviewModal({ listingId, onClose, onReview, isBusiness }: { listingId: string; onClose: () => void; onReview: (review: unknown) => void; isBusiness?: boolean }) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevListingIdRef = useRef<string>();
  const prevIsBusinessRef = useRef<boolean>();

  // Reset form when props change
  if (prevListingIdRef.current !== listingId || prevIsBusinessRef.current !== isBusiness) {
    prevListingIdRef.current = listingId;
    prevIsBusinessRef.current = isBusiness;
    setComment("");
    setRating(5);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // Haal huidige session token op (voor het geval cookies niet goed doorkomen server-side)
  const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders.Authorization = `Bearer ${session.access_token}`;
        // optioneel: meegeven apikey zodat Supabase edge function consistent is
        if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          authHeaders.apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        }
      }
    } catch {
      // negeer token fetch fouten; we proberen gewoon met cookies
    }

    const endpoint = `/api/reviews`;
    let actualListingId = listingId;
    if (isBusiness && listingId === "self") {
      // For business reviews on profile page, use current user's ID
      const { createClient } = await import("@/lib/supabaseClient");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        actualListingId = user.id;
      } else {
        setError("Niet ingelogd");
        return;
      }
    }
    const bodyData = isBusiness 
      ? { business_id: actualListingId, rating, comment }
      : { listing_id: actualListingId, rating, comment };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(bodyData),
    });
    if (res.ok) {
      const newReview = await res.json();
      onReview(newReview);
      setComment("");
      setRating(5);
      onClose();
    } else {
      if (res.status === 401) {
        setError("Inloggen vereist om een review te plaatsen.");
      } else {
        try {
          const err = await res.json();
            setError(err.error || "Review kon niet worden opgeslagen.");
        } catch {
          setError("Review kon niet worden opgeslagen.");
        }
      }
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl">×</button>
        <h2 className="text-lg font-semibold mb-4">Review plaatsen</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
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
          <button type="submit" disabled={submitting || !comment} className="btn btn-primary w-full">
            <span className="rounded-full bg-primary text-black px-4 py-2 font-semibold w-full border border-primary/30 shadow hover:bg-primary/80 transition">
              {submitting ? "Verzenden..." : "Review plaatsen"}
            </span>
          </button>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </form>
      </div>
    </div>
  );
}
