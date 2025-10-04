"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

export type CategorySidebarCategory = {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string; slug: string }[];
};

export default function CategorySidebar({ categories }: { categories: CategorySidebarCategory[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Ondersteun ook legacy ?cat= uit oudere links / home
  const activeCategoryParam = params.get("category") || params.get("cat") || undefined; // kan slug of id zijn
  const activeSubParam = params.get("sub") || params.get("subcategory") || undefined; // kan slug of id zijn

  // Bepaal initieel open category (als een sub actief is, open zijn parent)
  const activeCategoryId = useMemo(() => {
    // 1) Probeer category param als slug of id
    if (activeCategoryParam) {
      const isNum = /^\d+$/.test(activeCategoryParam);
      const byCat = isNum
        ? categories.find(c => String(c.id) === activeCategoryParam)
        : categories.find(c => c.slug === activeCategoryParam);
      if (byCat) return byCat.id;
    }
    // 2) Afleiden via sub param (slug of id)
    if (activeSubParam) {
      const isNum = /^\d+$/.test(activeSubParam);
      for (const c of categories) {
        const match = c.subcategories.some(s => isNum ? String(s.id) === activeSubParam : s.slug === activeSubParam);
        if (match) return c.id;
      }
    }
    return null;
  }, [activeCategoryParam, activeSubParam, categories]);

  const [openId, setOpenId] = useState<number | null>(activeCategoryId);
  const [isPending, startTransition] = useTransition();
  const asideRef = useRef<HTMLDivElement | null>(null);
  const lastScrollRef = useRef<number>(0);

  // Als URL verandert en er is een nieuwe actieve category, hou die open.
  useEffect(() => {
    if (activeCategoryId && openId !== activeCategoryId) {
      setOpenId(activeCategoryId);
    }
  }, [activeCategoryId, openId]);

  // Helper: bouw nieuwe URL met behoud van andere filters
  const buildAndNavigate = useCallback((catSlugOrId?: string, subSlugOrId?: string) => {
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("page");
    if (catSlugOrId) newParams.set("category", catSlugOrId); else newParams.delete("category");
    if (subSlugOrId) {
      newParams.set("sub", subSlugOrId);
      newParams.delete("subcategory");
    } else {
      newParams.delete("sub");
      newParams.delete("subcategory");
    }
    // Bewaar huidige scrollpositie zodat we hem kunnen herstellen
    lastScrollRef.current = window.scrollY;
    startTransition(() => {
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    });
  }, [params, router, pathname]);

  // Herstel scroll positie om 'verspringen' te minimaliseren
  useEffect(() => {
    if (isPending) return; // wachten tot navigatie klaar
    if (lastScrollRef.current) {
      window.scrollTo({ top: lastScrollRef.current, behavior: 'instant' as ScrollBehavior });
      lastScrollRef.current = 0;
    }
  }, [isPending]);

  const handleCategoryClick = (cat: CategorySidebarCategory) => {
    // Toggle open; bij click ook navigeren naar alleen category (zonder sub)
    setOpenId(openId === cat.id ? null : cat.id);
    // Fallback naar id wanneer slug ontbreekt
    buildAndNavigate(cat.slug || String(cat.id), undefined);
  };

  const handleSubcategoryClick = (cat: CategorySidebarCategory, sub: { id: number; name: string; slug: string }) => {
    // Fallback naar id wanneer slug ontbreekt
    buildAndNavigate(cat.slug || String(cat.id), sub.slug || String(sub.id));
  };
  return (
  <aside ref={asideRef} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 h-fit relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm text-primary animate-pulse rounded-xl z-10">
          Laden…
        </div>
      )}
  <h2 className="text-xl font-bold mb-4 text-primary">Categorieën</h2>
  <ul className="space-y-1">
        {categories.length === 0 ? (
          <li className="text-gray-400">Geen categorieën gevonden.</li>
        ) : (
          categories.map((cat) => (
            <li key={cat.id}>
              <button
                className={`w-full text-left px-4 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-primary truncate ${
                  (cat.slug && cat.slug === activeCategoryParam) || String(cat.id) === activeCategoryParam ? "bg-primary text-white shadow" : "text-gray-800 hover:bg-primary/10"
                }`}
                onClick={() => handleCategoryClick(cat)}
                aria-expanded={openId === cat.id}
                aria-current={(cat.slug && cat.slug === activeCategoryParam) || String(cat.id) === activeCategoryParam ? "true" : undefined}
              >
                <span className="truncate">{cat.name}</span>
              </button>
              {openId === cat.id && cat.subcategories.length > 0 && (
                <ul className="ml-3 mt-1 pl-3 border-l-2 border-primary/20 space-y-[2px]">
                  {cat.subcategories.map((sub) => (
                    <li key={sub.id}>
                      <button
                        className={`block w-full text-left px-3 py-1 rounded-lg text-sm cursor-pointer transition-colors duration-150 truncate ${
                          (sub.slug && sub.slug === activeSubParam) || String(sub.id) === activeSubParam
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-gray-700 hover:bg-primary/20"
                        }`}
                        onClick={() => handleSubcategoryClick(cat, sub)}
                        aria-current={(sub.slug && sub.slug === activeSubParam) || String(sub.id) === activeSubParam ? "true" : undefined}
                      >
                        <span className="truncate">{sub.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
