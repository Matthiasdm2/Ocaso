import React from "react";

export default function RatingStars({ rating = 0, max = 5, size = 18 }: { rating: number; max?: number; size?: number }) {
  // Afronden op halve ster
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => {
        const full = i + 1 <= rounded;
        const half = !full && i + 0.5 === rounded;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill={full ? "#FFD700" : half ? "url(#half)" : "#E5E7EB"}
            style={{ display: "inline-block" }}
          >
            <defs>
              <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <polygon points="10,1 12.59,7.36 19.51,7.36 13.96,11.64 16.55,18 10,13.72 3.45,18 6.04,11.64 0.49,7.36 7.41,7.36" />
          </svg>
        );
      })}
    </span>
  );
}
