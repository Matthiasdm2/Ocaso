"use client";
import { useEffect, useState } from "react";

interface Item { id: string; label: string; }

const items: Item[] = [
  { id: "over", label: "Over" },
  { id: "aanbod", label: "Aanbod" },
  { id: "statistieken", label: "Statistieken" },
  { id: "reviews", label: "Reviews" },
];

export default function BusinessSectionNav() {
  const [active, setActive] = useState<string>(items[0].id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(e.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.2, 0.5, 1] }
    );
    items.forEach(i => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => { obs.disconnect(); };
  }, []);

  const handleClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b">
      <div className="container flex gap-6 overflow-x-auto no-scrollbar py-2 text-sm font-medium">
        {items.map(it => {
          const isActive = active === it.id;
          return (
            <a
              key={it.id}
              href={`#${it.id}`}
              onClick={handleClick(it.id)}
              className={`relative px-1 pb-1 transition-colors whitespace-nowrap ${isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {it.label}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
