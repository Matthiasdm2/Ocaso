"use client";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { formatPrice } from "@/lib/formatPrice";

interface Initial {
  q: string;
  min?: number;
  max?: number;
  sort: string;
  cat?: number;
}

export default function BusinessAanbodFilters({ initial, categories }: { initial: Initial; categories: { id: number; name: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(initial.q || "");
  const [min, setMin] = useState(initial.min?.toString() || "");
  const [max, setMax] = useState(initial.max?.toString() || "");
  // Map legacy sort keys from older business shop to marketplace keys
  const normalizeSort = (s?: string) => {
    switch (s) {
      case 'nieuwste': return 'date_desc';
      case 'oudste': return 'date_asc';
      case 'prijs_laag': return 'price_asc';
      case 'prijs_hoog': return 'price_desc';
      case 'meest_bekeken': return 'views_desc';
      case 'minst_bekeken': return 'views_asc';
      case 'meest_favoriet': return 'favorites_desc';
      case 'minst_favoriet': return 'favorites_asc';
      default: return s || 'relevance';
    }
  };
  const [sort, setSort] = useState(normalizeSort(initial.sort));
  const [cat, setCat] = useState(initial.cat?.toString() || "");

  // Sync when URL changes externally
  useEffect(() => {
    setQ(sp.get('q') || "");
    setMin(sp.get('min') || "");
    setMax(sp.get('max') || "");
  setSort(normalizeSort(sp.get('sort') || undefined));
    setCat(sp.get('cat') || "");
  }, [sp]);

  const setParam = useCallback((key: string, value: string | undefined) => {
    const params = new URLSearchParams(sp.toString());
    if (!value || (key === 'sort' && value === 'relevance')) params.delete(key); else params.set(key, value);
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [sp, router, pathname]);

  const reset = () => {
    setQ(""); setMin(""); setMax(""); setSort("relevance"); setCat("");
    const params = new URLSearchParams(sp.toString());
    ['q','min','max','sort','cat','page'].forEach(k => params.delete(k));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 md:p-5 shadow-sm space-y-3 text-[13px]">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 leading-tight">
          {min && <span className="px-2 py-0.5 bg-gray-100 rounded-full">min {formatPrice(min)}</span>}
          {max && <span className="px-2 py-0.5 bg-gray-100 rounded-full">max {formatPrice(max)}</span>}
          {q && <span className="px-2 py-0.5 bg-gray-100 rounded-full truncate max-w-[12rem]">“{q}”</span>}
          {cat && <span className="px-2 py-0.5 bg-gray-100 rounded-full">cat #{cat}</span>}
        </div>
        <button onClick={reset} className="text-[11px] text-primary hover:underline" type="button">Reset</button>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6 items-start">
        <div className="md:col-span-2 xl:col-span-3">
          <label htmlFor="ba-q" className="block text-[11px] font-medium text-gray-600 mb-1">Zoeken</label>
          <input id="ba-q" name="q" value={q} onChange={e => { setQ(e.target.value); setParam('q', e.target.value || undefined); }} placeholder="Titel..." className="filter-input h-8 w-full" />
        </div>
        <div className="md:col-span-1 xl:col-span-1">
          <label className="block text-[11px] text-gray-600 mb-1">Prijs min</label>
          <input id="ba-min" name="min" value={min} onChange={e => { setMin(e.target.value); setParam('min', e.target.value || undefined); }} inputMode="numeric" placeholder="€" className="filter-input h-8" />
        </div>
        <div className="md:col-span-1 xl:col-span-1">
          <label className="block text-[11px] text-gray-600 mb-1">Prijs max</label>
          <input id="ba-max" name="max" value={max} onChange={e => { setMax(e.target.value); setParam('max', e.target.value || undefined); }} inputMode="numeric" placeholder="€" className="filter-input h-8" />
        </div>
        <div className="md:col-span-1 xl:col-span-1">
          <label className="block text-[11px] text-gray-600 mb-1">Sorteren</label>
          <select value={sort} onChange={e => { setSort(e.target.value); setParam('sort', e.target.value || undefined); }} className="filter-select h-8 min-w-[12rem] md:min-w-[14rem]">
            <option value="relevance">Relevantie</option>
            <option value="date_desc">Nieuwste eerst</option>
            <option value="date_asc">Oudste eerst</option>
            <option value="price_asc">Prijs (laag → hoog)</option>
            <option value="price_desc">Prijs (hoog → laag)</option>
            <option value="views_desc">Meeste views</option>
            <option value="views_asc">Minste views</option>
            <option value="favorites_desc">Meeste favorieten</option>
            <option value="favorites_asc">Minste favorieten</option>
          </select>
        </div>
        <div className="md:col-span-1 xl:col-span-1">
          <label className="block text-[11px] text-gray-600 mb-1">Categorie</label>
          <select value={cat} onChange={e => { setCat(e.target.value); setParam('cat', e.target.value || undefined); }} className="filter-select h-8">
            <option value="">Alle categorieën</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
