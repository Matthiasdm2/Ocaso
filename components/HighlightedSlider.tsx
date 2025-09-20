"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Listing } from "@/lib/types";

export default function HighlightedSlider({
  catName,
  subName,
}: {
  catName?: string;
  subName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [paused, setPaused] = useState(false);

  const scrollBy = (dx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    setPaused(true);
    el.scrollBy({ left: dx, behavior: "smooth" });
    // resume after short delay
    setTimeout(() => setPaused(false), 1500);
  };

  useEffect(() => {
    // autoplay every 3s; loop back to start
    const el = scrollerRef.current;
    if (!el) return;
    const tick = () => {
      if (paused) return;
      const maxLeft = el.scrollWidth - el.clientWidth;
      const nearEnd = el.scrollLeft >= maxLeft - 8;
      if (nearEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 260, behavior: "smooth" }); // approx one card
      }
    };
    intervalRef.current = setInterval(tick, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, catName, subName]);
  const [items, setItems] = useState<Listing[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("cat", catName || "Algemeen");
    if (subName) params.set("sub", subName as string);
    fetch("/api/highlighted?" + params.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, [catName, subName]);

  if (items.length === 0) return null;

  return (
    <div className="card p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Uitgelicht in {catName}
          {subName ? ` › ${subName}` : ""}
        </h3>
        <div className="text-xs text-gray-500">Horizontaal scrollen</div>
      </div>
      <div
        className="overflow-x-auto hidden-scroll"
        ref={scrollerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="flex gap-3 min-w-full">
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/listings/${it.id}`}
              className="w-56 shrink-0"
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                {it.images && it.images.length > 0 && it.images[0] && (
                  <Image
                    src={it.images[0]}
                    alt={it.title}
                    fill={true}
                    className="object-cover"
                  />
                )}
              </div>
              <div className="mt-2 text-sm line-clamp-1">{it.title}</div>
              <div className="font-medium">€ {Math.round(it.price)}</div>
            </Link>
          ))}
        </div>
      </div>

      <button
        aria-label="Scroll links"
        onClick={() => scrollBy(-260)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-white/50 hover:bg-white shadow transition hidden sm:inline-flex"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <span className="select-none">{"<"}</span>
      </button>
      <button
        aria-label="Scroll rechts"
        onClick={() => scrollBy(260)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-white/50 hover:bg-white shadow transition hidden sm:inline-flex"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <span className="select-none">{">"}</span>
      </button>
    </div>
  );
}
