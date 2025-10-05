"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Simple filter UI (locatie, staat, prijs min/max, sorteren)
// Manipuleert query parameters zodat de server component opnieuw rendert met gefilterde resultaten.
export default function MarketplaceFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const priceMin = searchParams.get("priceMin") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const state = searchParams.get("state") || "";
  const location = searchParams.get("location") || "";
  const sort = searchParams.get("sort") || "";
  // Nieuwe betekenis: toggle AAN = zakelijke verkopers zichtbaar. Param business=1 betekent tonen.
  const business = searchParams.get("business") === "1" || !searchParams.get("business");
  const centerLat = searchParams.get("clat") || "";
  const radius = searchParams.get("radius") || "";

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) params.delete(key); else params.set(key, value);
      // Reset page bij filter wijziging
      params.delete("page");
      const url = `${pathname}?${params.toString()}`;
      router.replace(url, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["priceMin", "priceMax", "state", "location", "sort", "business", "page"].forEach((k) => params.delete(k));
    ["clat", "clng", "radius", "area"].forEach((k) => params.delete(k));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setMulti = (obj: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(obj).forEach(([k, v]) => {
      if (!v) params.delete(k); else params.set(k, v);
    });
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMulti({
          clat: pos.coords.latitude.toFixed(5),
          clng: pos.coords.longitude.toFixed(5),
          radius: radius || "25", // default 25km if none
        });
      },
      () => {
        // silently ignore
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const clearLocation = () => setMulti({ clat: undefined, clng: undefined, radius: undefined, area: undefined });

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-wrap gap-2 text-sm text-gray-500 leading-tight">
          {priceMin && <span className="px-2 py-0.5 bg-gray-100 rounded-full">min €{priceMin}</span>}
          {priceMax && <span className="px-2 py-0.5 bg-gray-100 rounded-full">max €{priceMax}</span>}
          {state && <span className="px-2 py-0.5 bg-gray-100 rounded-full">{state}</span>}
          {location && <span className="px-2 py-0.5 bg-gray-100 rounded-full">{location}</span>}
          {business && <span className="px-2 py-0.5 bg-gray-100 rounded-full">Zakelijk zichtbaar</span>}
          {centerLat && radius && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">≤ {radius} km</span>
          )}
        </div>
        <button onClick={reset} className="text-sm text-primary hover:underline">Reset</button>
      </div>

      {/* Rij 1 */}
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6 items-start">
        <div className="md:col-span-2 xl:col-span-3">
          <label className="block text-sm font-medium text-gray-600 mb-1">Locatie & straal</label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={location}
              onChange={(e) => setParam("location", e.target.value || undefined)}
              placeholder="Alle"
              className="filter-input h-8 w-40"
            />
            {centerLat ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={radius || 25}
                    onChange={(e) => setParam("radius", e.target.value)}
                    className="h-2 accent-primary cursor-pointer"
                  />
                  <input
                    type="number"
                    min={1}
                    max={250}
                    value={radius || 25}
                    onChange={(e) => setParam("radius", e.target.value || undefined)}
                    className="filter-input h-8 w-16 text-center"
                  />
                  <span className="text-sm text-gray-500">km</span>
                </div>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-sm px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Wis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event('ocaso-open-map'));
                  }}
                  title="Open kaart (popup) en Shift + sleep of 'Selecteer gebied'"
                  className="text-sm px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"
                >
                  Gebied
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={useMyLocation}
                className="text-sm px-3 py-1.5 rounded-full bg-primary text-white hover:bg-primary/80 shadow-sm"
              >
                Gebruik mijn locatie
              </button>
            )}
          </div>
          {centerLat && (
            <p className="mt-1 text-sm text-gray-500 leading-tight">
              Straal filtering actief • centrum gezet via je apparaatlocatie.
            </p>
          )}
        </div>
        <div className="md:col-span-1 xl:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Staat</label>
          <select
            value={state}
            onChange={(e) => setParam("state", e.target.value || undefined)}
            className="filter-select h-8"
          >
            <option value="">Alle</option>
            <option value="Nieuw">Nieuw</option>
            <option value="Zo goed als nieuw">Zo goed als nieuw</option>
            <option value="Gebruikt">Gebruikt</option>
            <option value="Opknapper">Opknapper</option>
          </select>
        </div>
        <div className="md:col-span-1 xl:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Sorteren</label>
          <select
            value={sort || "relevance"}
            onChange={(e) => setParam("sort", e.target.value || undefined)}
            className="filter-select h-8 min-w-[12rem] md:min-w-[14rem]"
          >
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
      </div>

  {/* Rij 2 */}
  <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-7 items-center">
        <div className="md:col-span-2 xl:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Prijs min</label>
          <input
            type="number"
            value={priceMin}
            onChange={(e) => setParam("priceMin", e.target.value || undefined)}
            placeholder="€"
            className="filter-input h-8"
            min={0}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Prijs max</label>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => setParam("priceMax", e.target.value || undefined)}
            placeholder="€"
            className="filter-input h-8"
            min={0}
          />
        </div>
        <div className="md:col-span-1 xl:col-span-1 flex items-center mt-4 md:mt-6 xl:mt-6">
          <button
            type="button"
            onClick={() => setParam("business", business ? "0" : "1")}
            className={`group inline-flex items-center gap-2 text-sm select-none ${business ? "text-primary" : "text-gray-600"}`}
            aria-pressed={business}
            aria-label="Zakelijke verkopers tonen of verbergen"
          >
            <span
              className={`relative h-4 w-8 rounded-full transition-colors duration-200 flex items-center px-0.5 ${business ? "bg-primary" : "bg-gray-300"}`}
            >
              <span
                className={`h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${business ? "translate-x-3" : "translate-x-0"}`}
              />
            </span>
            Zakelijk
          </button>
        </div>
      </div>
    </div>
  );
}
