"use client";

import Image from "next/image";
import { useRef } from "react";

type FeaturedItem = {
  id: string | number;
  title: string;
  price: number;
  image?: string | null;
  href: string;
  location?: string | null;
};

type FeaturedStripProps = {
  title?: string;
  items: FeaturedItem[];
  className?: string;
};

export default function FeaturedStrip({ title = "Uitgelicht in deze categorie", items, className = "" }: FeaturedStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (!items?.length) return null;

  return (
    <section className={["rounded-2xl border border-gray-200 bg-white shadow-sm", "px-4 lg:px-5", "py-4 lg:py-5", className].join(" ")}> {/* padding split for easier override */}
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">{title}</h2>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            aria-label="Scroll links"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(320)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            aria-label="Scroll rechts"
          >
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        className="grid grid-cols-2 gap-3 md:flex md:gap-4 md:overflow-x-auto md:snap-x md:snap-mandatory md:scroll-p-2 md:[-ms-overflow-style:none] md:[scrollbar-width:none]"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Hide scrollbar (webkit) */}
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {items.map((it) => (
          <a
            key={it.id}
            href={it.href}
            className="w-full md:snap-start md:shrink-0 md:w-[260px] rounded-2xl border border-gray-200 bg-white hover:shadow transition"
            title={it.title}
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100 rounded-t-2xl">
              {/* Gebruik je eigen Next/Image als je wil; hieronder Next.js <Image> voor optimalisatie */}
              <Image
                src={it.image || "/placeholder.png"}
                alt={it.title}
                className="h-full w-full object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 260px"
                style={{ objectFit: "cover" }}
                loading="lazy"
                priority={false}
              />
            </div>
            <div className="p-4 md:p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-medium text-gray-900">{it.title}</h3>
                  {it.location ? (
                    <p className="mt-1 text-sm text-gray-500">{it.location}</p>
                  ) : null}
                </div>
                <div className="shrink-0 rounded-lg bg-gray-900 font-semibold text-white px-2 py-1 text-sm">
                  € {Number(it.price).toLocaleString("nl-BE")}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
