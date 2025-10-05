"use client";
import { useEffect, useState } from "react";

import RatingStars from "./RatingStars";

interface Props {
	businessId: string;
	initialRating?: number;
	initialCount?: number;
	className?: string;
	compact?: boolean; // alleen cijfers + ster
}

export default function BusinessRatingLive({ businessId, initialRating = 0, initialCount = 0, className = "", compact }: Props) {
	const [rating, setRating] = useState(initialRating);
	const [count, setCount] = useState(initialCount);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Indien we nog geen rating hebben maar er wel een id is -> fetch
		if (!businessId) return;
		if (initialRating && initialCount) return; // al server-rendered meegeleverd
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/business/${businessId}`, { cache: "no-store" });
				if (!res.ok) throw new Error("fetch failed");
				const json = await res.json();
				if (!cancelled) {
					if (typeof json.rating === "number") setRating(json.rating);
					if (typeof json.reviewCount === "number") setCount(json.reviewCount);
				}
			} catch {
				// negeren; laat default
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [businessId, initialRating, initialCount]);

	if (loading && !rating) {
		return <span className={`inline-flex items-center gap-1 text-sm text-gray-400 ${className}`}>Laden…</span>;
	}

	if (compact) {
		return (
			<span className={`inline-flex items-center gap-1 text-sm ${className}`} aria-label={`Beoordeling ${rating.toFixed(1)} uit 5`}>
				<RatingStars rating={rating} size={14} />
				<span>{rating.toFixed(1)}</span>
				{count > 0 && <span className="text-gray-400">({count})</span>}
			</span>
		);
	}

	return (
		<span className={`inline-flex items-center gap-2 text-sm ${className}`} aria-label={`Gemiddelde beoordeling ${rating.toFixed(1)} uit 5 bij ${count} reviews`}>
			<span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
				<RatingStars rating={rating} size={16} />
				<strong>{rating.toFixed(1)}</strong>
				<span className="text-gray-400">/5</span>
				{count > 0 && <span className="ml-1 text-gray-500">({count})</span>}
			</span>
		</span>
	);
}

