"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function SearchFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const priceMin = searchParams.get("priceMin") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const state = searchParams.get("state") || "";
  const location = searchParams.get("location") || "";
  const sort = searchParams.get("sort") || "relevance";
  const business = searchParams.get("business"); // undefined of '0' (verberg zakelijk) of '1'

  const setParam = useCallback((key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key); else params.set(key, value);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
  ["priceMin","priceMax","state","location","sort","page","business"].forEach(k => params.delete(k));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-smooth space-y-4 text-[13px]">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-sm">Filters</h2>
        <button onClick={reset} className="text-[11px] text-primary hover:underline">Reset</button>
      </div>
  <div className="grid gap-4 md:grid-cols-6 lg:grid-cols-9">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-600">Prijs min</label>
          <input
            type="number"
            value={priceMin}
            onChange={e => setParam("priceMin", e.target.value || undefined)}
            placeholder="€"
            className="filter-input h-8 w-full"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-600">Prijs max</label>
          <input
            type="number"
            value={priceMax}
            onChange={e => setParam("priceMax", e.target.value || undefined)}
            placeholder="€"
            className="filter-input h-8 w-full"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-600">Staat</label>
          <select
            value={state}
            onChange={e => setParam("state", e.target.value || undefined)}
            className="filter-select h-8 w-full"
          >
            <option value="">Alle</option>
            <option value="Nieuw">Nieuw</option>
            <option value="Zo goed als nieuw">Zo goed als nieuw</option>
            <option value="Gebruikt">Gebruikt</option>
            <option value="Opknapper">Opknapper</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2 lg:col-span-2">
          <label className="block text-[11px] font-medium text-gray-600">Locatie</label>
          <input
            value={location}
            onChange={e => setParam("location", e.target.value || undefined)}
            placeholder="Alle"
            className="filter-input h-8 w-full"
          />
        </div>
        <div className="space-y-1 md:col-span-2 lg:col-span-2">
          <label className="block text-[11px] font-medium text-gray-600">Sorteren</label>
          <select
            value={sort}
            onChange={e => setParam("sort", e.target.value || undefined)}
            className="filter-select h-8 w-full"
          >
            <option value="relevance">Relevantie</option>
            <option value="date_desc">Nieuwste eerst</option>
            <option value="date_asc">Oudste eerst</option>
            <option value="price_asc">Prijs (laag → hoog)</option>
            <option value="price_desc">Prijs (hoog → laag)</option>
          </select>
        </div>
        <div className="space-y-1 flex flex-col justify-end">
          <label className="block text-[11px] font-medium text-gray-600">Zakelijk</label>
          <button
            type="button"
            onClick={() => setParam("business", business === '0' ? undefined : '0')}
            className={`h-8 px-4 inline-flex items-center justify-center rounded-full text-[11px] font-medium transition ${business === '0' ? 'bg-gray-200 text-gray-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
            title={business === '0' ? 'Toon zakelijke verkopers' : 'Verberg zakelijke verkopers'}
          >
            {business === '0' ? 'Verborgen' : 'Zichtbaar'}
          </button>
        </div>
      </div>
    </div>
  );
}
