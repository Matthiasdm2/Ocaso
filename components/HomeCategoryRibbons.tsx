"use client";

// External
import Link from "next/link";
import { useEffect, useState } from "react";

type Category = {
  id: number | string; // Support both UUIDs (string) and legacy integer IDs
  name: string;
  slug: string;
  icon_url: string | null;
  subcategories: Array<{id: number | string; name: string; slug: string}>;
};

// Emoji fallback per hoofdcategorie (slug -> emoji) voor als icon_url null is
const CATEGORY_EMOJI: Record<string, string> = {
  elektronica: "📺",
  "huis-tuin": "🏠",
  "auto-motor": "🚗",
  "mode-schoenen": "👗",
  "fietsen-brommers": "🚲",
  "sport-hobby": "🏋️",
  "boeken-media": "🎵",
  "baby-kind": "🍼",
  zakelijk: "🛠️",
  computers: "💻",
  "phones-tablets": "📱",
  kleding: "👗",
  "kinderen-baby": "🍼",
  "sport-fitness": "🏋️",
  hobbys: "🎨",
  "muziek-boeken-films": "🎵",
  games: "🎮",
  dieren: "🐾",
  bouw: "🧰",
  "caravans-boten": "🚐",
  tickets: "🎫",
  diensten: "🛠️",
  immo: "🏠",
  gratis: "🎁",
};

function CategoryAvatar({ name, slug, icon_url }: { name: string; slug: string; icon_url: string | null }) {
  // Uniforme container styling voor alle iconen - consistent voor zowel Tabler icons als emoji's
  const containerClass = "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/30";
  
  // Filter om alle iconen naar primary kleur (#6EE7B7) te converteren
  // Deze filter converteert zwart naar de primary kleur
  const iconFilter = "brightness(0) saturate(100%) invert(67%) sepia(11%) saturate(1352%) hue-rotate(106deg) brightness(95%) contrast(89%)";
  
  // State voor error handling
  const [imageError, setImageError] = useState(false);
  const emoji = CATEGORY_EMOJI[slug] || "📦";
  
  // Reset error state als icon_url verandert
  useEffect(() => {
    setImageError(false);
  }, [icon_url]);
  
  // Normaliseer icon URL - vervang ALLE varianten van @tabler/icons met tabler-icons
  const normalizedIconUrl = icon_url 
    ? icon_url
        .replace(/@tabler\/icons@latest/g, 'tabler-icons@latest')
        .replace(/@tabler\/icons\//g, 'tabler-icons@latest/icons/')
        .replace(/@tabler\/icons/g, 'tabler-icons@latest')
    : null;
  
  // Gebruik icon_url als deze bestaat en er geen error is, anders fallback naar emoji
  if (normalizedIconUrl && !imageError) {
    return (
      <div
        className={containerClass}
        aria-hidden
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={normalizedIconUrl}
          alt={name}
          width={24}
          height={24}
          className="w-6 h-6"
          style={{ 
            filter: iconFilter,
            WebkitFilter: iconFilter,
            display: 'block',
            objectFit: 'contain',
          }}
          onError={() => {
            console.warn('Failed to load icon:', normalizedIconUrl, 'for category:', name, '- falling back to emoji');
            setImageError(true);
          }}
        />
      </div>
    );
  }
  
  // Fallback naar emoji als icon_url null is of als er een error is
  return (
    <div
      className={containerClass}
      aria-hidden
      title={name}
    >
      <span className="leading-none text-xl">{emoji}</span>
    </div>
  );
}

export default function HomeCategoryRibbons() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        // The API route now includes Cache-Control headers for 5 minute caching
        // Browser will cache based on those headers automatically
        const res = await fetch("/api/categories", {
          // Disable cache to see changes immediately during development
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json() as Category[];
          setCategories(data);
        }
      } catch (error) {
        console.warn("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  if (categories.length === 0) {
    return null; // Toon niets als nog aan het laden of geen categorieën
  }

  // Eén horizontale scrollcontainer met 2 visuele rijen (grid) zodat alles synchroon scrollt.
  const scroll = (dir: "left" | "right") => {
    const el = document.getElementById("home-cat-ribbons");
    if (!el) return;
    const delta = dir === "left" ? -400 : 400;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative" aria-label="Hoofdcategorieën">
      {/* Arrow buttons (desktop) */}
      <button
        type="button"
        aria-label="Scroll links"
        onClick={() => scroll("left")}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border bg-white shadow hover:bg-gray-50"
      >
        <span className="sr-only">Links</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Scroll rechts"
        onClick={() => scroll("right")}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border bg-white shadow hover:bg-gray-50"
      >
        <span className="sr-only">Rechts</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <div
        id="home-cat-ribbons"
        className="hidden-scroll overflow-x-auto px-1"
        role="listbox"
        aria-label="Scrollbare lijst hoofdcategorieën"
      >
        {/* Grid met twee rijen: we interleaven zodat bovenste rij eerste helft is en onderste rij tweede helft */}
        <ul className="grid grid-rows-2 grid-flow-col auto-cols-[200px] gap-x-3 gap-y-2 py-2 items-start">
          {(() => {
            const half = Math.ceil(categories.length / 2);
            const top = categories.slice(0, half);
            const bottom = categories.slice(half);
            // We bouwen kolommen: elke kolom heeft (optioneel) een top en bottom item
            const cols: Array<{ top?: Category; bottom?: Category }> = [];
            for (let i = 0; i < half; i++) {
              cols.push({ top: top[i], bottom: bottom[i] });
            }
            return cols.flatMap((col, ci) => [col.top, col.bottom].filter(Boolean).map((c, ri) => {
              if (!c) return null;
              return (
                <li
                  // key per category
                  key={c.slug}
                  className="w-[200px] h-[72px] flex-shrink-0"
                  role="option"
                  aria-selected="false"
                  aria-label={c.name}
                  data-col={ci}
                  data-row={ri}
                >
                  <Link
                    // Link nu direct naar marketplace met category filter (naam)
                    href={`/marketplace?category=${encodeURIComponent(c.name)}`}
                    className="group flex items-center gap-3 rounded-2xl border bg-white/70 backdrop-blur-sm px-3 py-2.5 hover:bg-white transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 h-full w-full"
                  >
                    <CategoryAvatar name={c.name} slug={c.slug} icon_url={c.icon_url} />
                    <span className="text-sm font-medium leading-tight line-clamp-2 group-hover:underline flex-1 min-w-0">
                      {c.name}
                    </span>
                  </Link>
                </li>
              );
            }));
          })()}
        </ul>
      </div>
    </div>
  );
}
