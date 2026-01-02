"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { formatPrice } from "@/lib/formatPrice";

// Vehicle category filter interface
interface VehicleFilter {
  id: number;
  filter_key: string;
  filter_label: string;
  filter_options: string[];
  placeholder: string;
  input_type: string;
  is_range: boolean;
  min_value?: number;
  max_value?: number;
  sort_order: number;
}

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
  const category = searchParams.get("category") || "";
  // Nieuwe betekenis: toggle AAN = zakelijke verkopers zichtbaar. Param business=1 betekent tonen.
  const business = searchParams.get("business") === "1" || !searchParams.get("business");
  const centerLat = searchParams.get("clat") || "";
  const radius = searchParams.get("radius") || "";

  // Vehicle filters state
  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilter[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [filtersFetchError, setFiltersFetchError] = useState<string | null>(null);

  // Vehicle category slugs that should show vehicle filters
  const vehicleCategorySlugs = ['auto-motor', 'bedrijfswagens', 'motoren', 'camper-mobilhomes'];
  const isVehicleCategory = vehicleCategorySlugs.includes(category);

  // Fetch vehicle filters when category changes to a vehicle category
  useEffect(() => {
    // DEBUG: Log category slug values
    console.log('[VEHICLE_FILTERS_DEBUG] Category:', `"${category}"`, 'Length:', category.length, 'IsVehicle:', isVehicleCategory);
    
    if (isVehicleCategory && category) {
      setIsLoadingFilters(true);
      setFiltersFetchError(null); // Reset error state
      
      console.log('[VEHICLE_FILTERS_DEBUG] Fetching filters for:', category);
      fetch(`/api/categories/filters?category=${category}`)
        .then(async res => {
          console.log('[VEHICLE_FILTERS_DEBUG] API Response status:', res.status);
          const data = await res.json();
          
          if (!res.ok) {
            // API returned an error response
            const errorMsg = data.error || `API responded with status ${res.status}`;
            const details = data.details ? `: ${data.details}` : '';
            throw new Error(`${errorMsg}${details}`);
          }
          
          return data;
        })
        .then(data => {
          console.log('[VEHICLE_FILTERS_DEBUG] API Response data:', data);
          if (data.filters && Array.isArray(data.filters)) {
            // Debug: log each filter
            data.filters.forEach((f: any) => {
              console.log('[VEHICLE_FILTERS_DEBUG] Filter:', {
                key: f.filter_key,
                label: f.filter_label,
                input_type: f.input_type,
                is_range: f.is_range,
                options_count: f.filter_options?.length || 0,
                options: f.filter_options
              });
            });
            setVehicleFilters(data.filters);
            setFiltersFetchError(null);
            console.log('[VEHICLE_FILTERS_DEBUG] Loaded', data.filters.length, 'filters');
          } else if (data.error) {
            // API returned error in response body
            setVehicleFilters([]);
            setFiltersFetchError(data.error + (data.details ? `: ${data.details}` : ''));
          } else {
            setVehicleFilters([]);
            setFiltersFetchError('Invalid response format - missing filters array');
          }
        })
        .catch(error => {
          console.error('[VEHICLE_FILTERS_DEBUG] Error loading vehicle filters:', error);
          setVehicleFilters([]);
          setFiltersFetchError(error.message || 'Onbekende fout bij het laden van filters');
        })
        .finally(() => {
          setIsLoadingFilters(false);
        });
    } else {
      setVehicleFilters([]);
      setFiltersFetchError(null);
    }
  }, [isVehicleCategory, category]);

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
          {priceMin && <span className="px-2 py-0.5 bg-gray-100 rounded-full">min {formatPrice(priceMin)}</span>}
          {priceMax && <span className="px-2 py-0.5 bg-gray-100 rounded-full">max {formatPrice(priceMax)}</span>}
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

      {/* Vehicle-specific filters (only for vehicle categories) */}
      {isVehicleCategory && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-700">Voertuigfilters</h3>
            {isLoadingFilters && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          
          {vehicleFilters.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {vehicleFilters.map((filter) => {
                // Determine selected value - check for range filters first
                let filterValue = searchParams.get(filter.filter_key) || "";
                const filterKey = filter.filter_key.toLowerCase();
                
                // For range filters, reconstruct the selected range string from min/max params
                if (filter.input_type === 'select' && !filter.is_range && filter.filter_options && filter.filter_options.length > 0) {
                  const minParam = searchParams.get(`${filter.filter_key}_min`);
                  const maxParam = searchParams.get(`${filter.filter_key}_max`);
                  
                  if (minParam || maxParam) {
                    // Try to match with an option
                    if (filterKey === 'bouwjaar' || filterKey === 'year') {
                      const min = minParam ? parseInt(minParam) : null;
                      const max = maxParam ? parseInt(maxParam) : null;
                      
                      if (min === max && min !== null) {
                        // Exact year match
                        filterValue = min.toString();
                      } else if (min && max) {
                        // Year range
                        filterValue = `${min}-${max}`;
                      } else if (max && max < 1980) {
                        filterValue = 'Voor 1980';
                      }
                    } else if (filterKey === 'kilometerstand' || filterKey === 'mileage_km') {
                      const min = minParam ? parseInt(minParam) : null;
                      const max = maxParam ? parseInt(maxParam) : null;
                      
                      // Format to match options: "< 20.000 km", "20.000 - 50.000 km", etc.
                      if (min && max) {
                        // Format with dots as thousand separators (Dutch format)
                        const formatKm = (km: number) => {
                          const thousands = Math.floor(km / 1000);
                          return `${thousands.toLocaleString('nl-NL')}.000`;
                        };
                        filterValue = `${formatKm(min)} - ${formatKm(max)} km`;
                      } else if (max) {
                        const formatKm = (km: number) => {
                          const thousands = Math.floor(km / 1000);
                          return `${thousands.toLocaleString('nl-NL')}.000`;
                        };
                        filterValue = `< ${formatKm(max)} km`;
                      } else if (min) {
                        const formatKm = (km: number) => {
                          const thousands = Math.floor(km / 1000);
                          return `${thousands.toLocaleString('nl-NL')}.000`;
                        };
                        filterValue = `> ${formatKm(min)} km`;
                      }
                    } else if (filterKey === 'vermogen' || filterKey === 'power_hp') {
                      const min = minParam ? parseInt(minParam) : null;
                      const max = maxParam ? parseInt(maxParam) : null;
                      
                      if (min && max) {
                        filterValue = `${min} - ${max} kW`;
                      } else if (max) {
                        filterValue = `< ${max} kW`;
                      } else if (min) {
                        filterValue = `> ${min} kW`;
                      }
                    }
                    
                    // Check if the reconstructed value exists in options
                    if (!filter.filter_options.includes(filterValue)) {
                      filterValue = ""; // Reset if no match
                    }
                  }
                } else {
                  filterValue = searchParams.get(filter.filter_key) || "";
                }
                
                return (
                  <div key={filter.filter_key} className="flex flex-col">
                    <label className="block text-sm text-gray-600 mb-1">
                      {filter.filter_label?.replace(/_/g, ' ') || filter.filter_key.replace(/_/g, ' ')}
                    </label>
                    
                    {/* Range filters: min/max number inputs (bouwjaar) */}
                    {filter.input_type === 'range' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={searchParams.get(`${filter.filter_key}_min`) || ""}
                          onChange={(e) => setParam(`${filter.filter_key}_min`, e.target.value || undefined)}
                          placeholder="Min"
                          className="filter-input h-8 w-20 text-sm"
                          min={filter.min_value}
                          max={filter.max_value}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          value={searchParams.get(`${filter.filter_key}_max`) || ""}
                          onChange={(e) => setParam(`${filter.filter_key}_max`, e.target.value || undefined)}
                          placeholder="Max"
                          className="filter-input h-8 w-20 text-sm"
                          min={filter.min_value}
                          max={filter.max_value}
                        />
                      </div>
                    )}
                    
                    {/* Number input: single number field (kilometerstand) */}
                    {filter.input_type === 'number' && (
                      <input
                        type="number"
                        value={filterValue}
                        onChange={(e) => setParam(filter.filter_key, e.target.value || undefined)}
                        placeholder={filter.placeholder}
                        className="filter-input h-8 text-sm"
                        min={filter.min_value}
                        max={filter.max_value}
                      />
                    )}
                    
                    {/* Select filters: dropdown with options */}
                    {filter.input_type === 'select' && Array.isArray(filter.filter_options) && filter.filter_options.length > 0 && (
                      <select
                        value={filterValue}
                        onChange={(e) => {
                          const selectedValue = e.target.value;
                          if (!selectedValue) {
                            // Clear filter
                            setParam(filter.filter_key, undefined);
                            // Also clear min/max if they exist
                            setParam(`${filter.filter_key}_min`, undefined);
                            setParam(`${filter.filter_key}_max`, undefined);
                            return;
                          }
                          
                          // Parse AutoScout24-style ranges
                          const filterKey = filter.filter_key.toLowerCase();
                          
                          // Year ranges: "2020-2025" or "2020"
                          if (filterKey === 'bouwjaar' || filterKey === 'year') {
                            if (selectedValue.includes('-')) {
                              const [min, max] = selectedValue.split('-').map(s => parseInt(s.trim()));
                              if (!isNaN(min)) setParam(`${filter.filter_key}_min`, min.toString());
                              if (!isNaN(max)) setParam(`${filter.filter_key}_max`, max.toString());
                              setParam(filter.filter_key, undefined); // Clear the range string
                            } else if (selectedValue === 'Voor 1980') {
                              setParam(`${filter.filter_key}_max`, '1979');
                              setParam(filter.filter_key, undefined);
                            } else {
                              const year = parseInt(selectedValue);
                              if (!isNaN(year)) {
                                setParam(`${filter.filter_key}_min`, year.toString());
                                setParam(`${filter.filter_key}_max`, year.toString());
                                setParam(filter.filter_key, undefined);
                              }
                            }
                            return;
                          }
                          
                          // Mileage ranges: "< 20.000 km", "20.000 - 50.000 km", etc.
                          if (filterKey === 'kilometerstand' || filterKey === 'mileage_km') {
                            const kmMatch = selectedValue.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*km/i);
                            const lessThanMatch = selectedValue.match(/<\s*(\d+\.?\d*)\s*km/i);
                            const moreThanMatch = selectedValue.match(/>\s*(\d+\.?\d*)\s*km/i);
                            
                            if (kmMatch) {
                              const min = parseInt(kmMatch[1].replace('.', ''));
                              const max = parseInt(kmMatch[2].replace('.', ''));
                              if (!isNaN(min)) setParam(`${filter.filter_key}_min`, min.toString());
                              if (!isNaN(max)) setParam(`${filter.filter_key}_max`, max.toString());
                            } else if (lessThanMatch) {
                              const max = parseInt(lessThanMatch[1].replace('.', ''));
                              if (!isNaN(max)) setParam(`${filter.filter_key}_max`, max.toString());
                              setParam(`${filter.filter_key}_min`, undefined);
                            } else if (moreThanMatch) {
                              const min = parseInt(moreThanMatch[1].replace('.', ''));
                              if (!isNaN(min)) setParam(`${filter.filter_key}_min`, min.toString());
                              setParam(`${filter.filter_key}_max`, undefined);
                            }
                            setParam(filter.filter_key, undefined); // Clear the range string
                            return;
                          }
                          
                          // Power ranges: "< 50 kW", "50 - 100 kW", etc.
                          if (filterKey === 'vermogen' || filterKey === 'power_hp') {
                            const kwMatch = selectedValue.match(/(\d+)\s*-\s*(\d+)\s*kw/i);
                            const lessThanMatch = selectedValue.match(/<\s*(\d+)\s*kw/i);
                            const moreThanMatch = selectedValue.match(/>\s*(\d+)\s*kw/i);
                            
                            if (kwMatch) {
                              setParam(`${filter.filter_key}_min`, kwMatch[1]);
                              setParam(`${filter.filter_key}_max`, kwMatch[2]);
                            } else if (lessThanMatch) {
                              setParam(`${filter.filter_key}_max`, lessThanMatch[1]);
                              setParam(`${filter.filter_key}_min`, undefined);
                            } else if (moreThanMatch) {
                              setParam(`${filter.filter_key}_min`, moreThanMatch[1]);
                              setParam(`${filter.filter_key}_max`, undefined);
                            }
                            setParam(filter.filter_key, undefined);
                            return;
                          }
                          
                          // Other ranges (cilinderinhoud, laadvermogen, lengte) - similar pattern
                          const rangeMatch = selectedValue.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                          const lessThanMatch2 = selectedValue.match(/<\s*(\d+\.?\d*)/);
                          const moreThanMatch2 = selectedValue.match(/>\s*(\d+\.?\d*)/);
                          
                          if (rangeMatch) {
                            const min = parseFloat(rangeMatch[1].replace('.', '').replace(',', '.'));
                            const max = parseFloat(rangeMatch[2].replace('.', '').replace(',', '.'));
                            if (!isNaN(min)) setParam(`${filter.filter_key}_min`, min.toString());
                            if (!isNaN(max)) setParam(`${filter.filter_key}_max`, max.toString());
                            setParam(filter.filter_key, undefined);
                          } else if (lessThanMatch2) {
                            const max = parseFloat(lessThanMatch2[1].replace('.', '').replace(',', '.'));
                            if (!isNaN(max)) setParam(`${filter.filter_key}_max`, max.toString());
                            setParam(`${filter.filter_key}_min`, undefined);
                            setParam(filter.filter_key, undefined);
                          } else if (moreThanMatch2) {
                            const min = parseFloat(moreThanMatch2[1].replace('.', '').replace(',', '.'));
                            if (!isNaN(min)) setParam(`${filter.filter_key}_min`, min.toString());
                            setParam(`${filter.filter_key}_max`, undefined);
                            setParam(filter.filter_key, undefined);
                          } else {
                            // Regular select value
                            setParam(filter.filter_key, selectedValue);
                          }
                        }}
                        className="filter-select h-8 text-sm"
                      >
                        <option value="">{filter.placeholder}</option>
                        {filter.filter_options.map((option) => (
                          <option key={option} value={option}>
                            {option.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    )}
                    
                  </div>
                );
              })}
            </div>
          )}
          
          {isVehicleCategory && filtersFetchError && !isLoadingFilters && (
            <p className="text-sm text-red-500 italic">
              ⚠️ Filters konden niet geladen worden. Probeer de pagina te vernieuwen.
            </p>
          )}
          
          {isVehicleCategory && !filtersFetchError && vehicleFilters.length === 0 && !isLoadingFilters && (
            <p className="text-sm text-gray-500 italic">
              Geen specifieke voertuigfilters beschikbaar voor deze categorie.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
