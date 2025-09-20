"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const categories = Array.from({ length: 40 }).map((_, i) => ({
  id: i + 1,
  name: `Marktplaats-categorie ${i + 1}`,
  icon: "📦",
}));

export default function CategoryScroller() {
  const scroll = (dir: "left" | "right") => {
    const el = document.getElementById("cat-scroll");
    if (!el) return;
    const delta = dir === "left" ? -400 : 400;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="container">
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white shadow p-2 hidden md:block"
        >
          <ChevronLeft />
        </button>
        <div id="cat-scroll" className="hidden-scroll overflow-x-auto">
          <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-3 py-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="card w-36 h-16 flex items-center justify-center"
              >
                <span className="text-lg">{c.icon}</span>
                <span className="ml-2 text-sm">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white shadow p-2 hidden md:block"
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  );
}
