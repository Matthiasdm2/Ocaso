"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
  const [q, setQ] = useState(initial.q || "");
  const [min, setMin] = useState(initial.min?.toString() || "");
  const [max, setMax] = useState(initial.max?.toString() || "");
  const [sort, setSort] = useState(initial.sort || "nieuwste");
  const [cat, setCat] = useState(initial.cat?.toString() || "");

  // Sync when URL changes externally
  useEffect(() => {
    setQ(sp.get('q') || "");
    setMin(sp.get('min') || "");
    setMax(sp.get('max') || "");
    setSort(sp.get('sort') || "nieuwste");
    setCat(sp.get('cat') || "");
  }, [sp]);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (min && !Number.isNaN(Number(min))) params.set('min', min);
    if (max && !Number.isNaN(Number(max))) params.set('max', max);
    if (sort && sort !== 'nieuwste') params.set('sort', sort);
    if (cat && cat !== '') params.set('cat', cat);
  router.push('?' + params.toString(), { scroll: false });
  }, [q, min, max, sort, cat, router]);

  const reset = () => {
  setQ(""); setMin(""); setMax(""); setSort("nieuwste"); setCat(""); router.push('?', { scroll: false });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="rounded-2xl border bg-white/70 backdrop-blur p-4 md:p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="ba-q" className="block text-xs font-medium text-gray-600 mb-1">Zoeken</label>
          <input id="ba-q" name="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Titel..." className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-600 mb-1">Min €</label>
          <input id="ba-min" name="min" value={min} onChange={e => setMin(e.target.value)} inputMode="numeric" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-600 mb-1">Max €</label>
          <input id="ba-max" name="max" value={max} onChange={e => setMax(e.target.value)} inputMode="numeric" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Sorteren</label>
          <select value={sort} onChange={e => setSort(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="nieuwste">Nieuwste</option>
            <option value="prijs_laag">Prijs laag - hoog</option>
            <option value="prijs_hoog">Prijs hoog - laag</option>
            <option value="meest_bekeken">Meest bekeken</option>
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
          <select value={cat} onChange={e => setCat(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Alle categorieën</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 md:ml-auto">
          <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2">Toepassen</button>
          <button onClick={reset} type="button" className="inline-flex items-center gap-1 rounded-lg border bg-white hover:bg-neutral-50 text-sm font-medium px-4 py-2">Reset</button>
        </div>
      </div>
    </form>
  );
}
