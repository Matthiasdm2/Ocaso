"use client";
import { useEffect, useState } from "react";

import RatingStars from "./RatingStars";

interface Props {
  initialAvg: number;
  initialCount: number;
}

export default function BusinessRatingBadge({ initialAvg, initialCount }: Props) {
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as { avg?: number; count?: number };
      if (typeof detail?.avg === 'number') setAvg(detail.avg);
      if (typeof detail?.count === 'number') setCount(detail.count);
    }
    window.addEventListener('ocaso:business-rating-updated', onUpdate);
    return () => window.removeEventListener('ocaso:business-rating-updated', onUpdate);
  }, []);

  if (!count) return null;

  return (
    <div className="inline-flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm" role="group" aria-label={`Gemiddelde beoordeling ${avg.toFixed(1)} uit 5 op basis van ${count} reviews`}>
      <RatingStars rating={avg} />
      <span className="font-semibold tabular-nums">{avg.toFixed(1)}</span>
      <span className="text-gray-400">/5</span>
      <span className="ml-1 text-sm text-gray-500">({count})</span>
    </div>
  );
}
