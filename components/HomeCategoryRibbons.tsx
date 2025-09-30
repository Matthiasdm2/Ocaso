"use client";

// External
import Link from "next/link";

// Internal
import { CATEGORIES } from "@/lib/categories";

// (hash utility verwijderd – niet meer nodig na emoji + primary kleur avatar)

// Emoji icon per hoofdcategorie (slug -> emoji)
const CATEGORY_EMOJI: Record<string, string> = {
  autos: "🚗",
  "fietsen-brommers": "🚲",
  "huis-inrichting": "🛋️",
  "tuin-terras": "🌿",
  elektronica: "📺",
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

function CategoryAvatar({ name, slug }: { name: string; slug: string }) {
  const emoji = CATEGORY_EMOJI[slug] || "•";
  return (
    <div
      className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-inner border border-primary/30"
      aria-hidden
      title={name}
    >
      <span className="leading-none">{emoji}</span>
    </div>
  );
}

export default function HomeCategoryRibbons() {
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
        <ul className="grid grid-rows-2 grid-flow-col auto-cols-max gap-x-3 gap-y-2 py-2">
          {(() => {
            const half = Math.ceil(CATEGORIES.length / 2);
            const top = CATEGORIES.slice(0, half);
            const bottom = CATEGORIES.slice(half);
            // We bouwen kolommen: elke kolom heeft (optioneel) een top en bottom item
            const cols: Array<{ top?: typeof CATEGORIES[number]; bottom?: typeof CATEGORIES[number] }> = [];
            for (let i = 0; i < half; i++) {
              cols.push({ top: top[i], bottom: bottom[i] });
            }
            return cols.flatMap((col, ci) => [col.top, col.bottom].filter(Boolean).map((c, ri) => {
              if (!c) return null;
              return (
                <li
                  // key per category
                  key={c.slug}
                  className="min-w-[200px]"
                  role="option"
                  aria-selected="false"
                  aria-label={c.name}
                  data-col={ci}
                  data-row={ri}
                >
                  <Link
                    // Link nu direct naar marketplace met category filter (naam)
                    href={`/marketplace?category=${encodeURIComponent(c.name)}`}
                    className="group flex items-center gap-3 rounded-2xl border bg-white/70 backdrop-blur-sm px-3 py-2.5 hover:bg-white transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <CategoryAvatar name={c.name} slug={c.slug} />
                    <span className="text-sm font-medium leading-tight line-clamp-2 group-hover:underline">
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
