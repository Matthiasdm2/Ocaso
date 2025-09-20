"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import HighlightedSlider from "../../components/HighlightedSlider";
import ListingRow from "../../components/ListingRow";
import Pagination from "../../components/Pagination";
import type { Listing } from "../../lib/types";

/** ---------- Types ---------- */
type Facets = {
  locations: string[];
  states: ("new" | "like-new" | "good" | "used")[];
};

type Subcategory = {
  id: number;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: boolean;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: boolean;
  subs: Subcategory[];
};

/** ---------- Supabase ---------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Haal categorieën + subcategorieën op.
 * Belangrijk: we gebruiken "subcategories:subcategories(...)" zodat we NIET afhankelijk zijn
 * van een relatie-alias "subs" in Supabase.
 */
async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      slug,
      sort_order,
      is_active,
      subcategories:subcategories (
        id,
        name,
        slug,
        sort_order,
        is_active,
        category_id
      )
    `)
    .order("name", { ascending: true })
    .order("name", { ascending: true, foreignTable: "subcategories" });

  if (error) {
  // log to console only in dev when needed
  if (process.env.NODE_ENV !== "production") console.error("fetchCategories error:", error);
    return [];
  }


  const rows = (data ?? []) as {
    id: number;
    name: string;
    slug: string;
    sort_order?: number;
    is_active?: boolean;
    subcategories?: Subcategory[];
  }[];

  // Normaliseer resultaat → alleen actieve subcategorieën tonen
  const normalized: Category[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sort_order: c.sort_order,
    is_active: c.is_active,
    subs: Array.isArray(c.subcategories)
      ? c.subcategories
          .filter((s: Subcategory) => s?.is_active !== false) // default true
          .sort((a: Subcategory, b: Subcategory) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((s: Subcategory) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            sort_order: s.sort_order,
            is_active: s.is_active,
          }))
      : [],
  }));

  return normalized;
}

/**
 * Resultaten ophalen (ongewijzigd t.o.v. jouw code)
 */
async function fetchResults(opts: {
  catId: number | undefined;
  subId: number | undefined;
  page: number;
  limit: number;
  priceMin?: number;
  priceMax?: number;
  state?: string;
  location?: string;
  sort?: string;
}): Promise<{ items: Listing[]; total: number; facets: Facets }> {
  const params = new URLSearchParams();
  if (opts.catId) params.set("catId", String(opts.catId));
  if (opts.subId) params.set("subId", String(opts.subId));
  params.set("page", String(opts.page));
  params.set("limit", String(opts.limit));
  if (opts.priceMin) params.set("priceMin", String(opts.priceMin));
  if (opts.priceMax) params.set("priceMax", String(opts.priceMax));
  if (opts.state) params.set("state", opts.state);
  if (opts.location) params.set("location", opts.location);
  if (opts.sort) params.set("sort", opts.sort);

  const res = await fetch("/api/search?" + params.toString(), {
    cache: "no-store",
  });
  const data = await res.json();
  return {
    items: data.results,
    total: data.total ?? data.results.length,
    facets: (data.facets ?? {
      locations: [],
      states: ["new", "like-new", "good", "used"],
    }) as Facets,
  };
}

/** ---------- Page Component ---------- */
export default function CategoriesPage() {
  const params = useSearchParams();
  const router = useRouter();

  const catSlug = params.get("cat") || "";
  const subName = params.get("sub") || "";
  const page = Number(params.get("page") || "1");
  const limit = 20;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((cats) => {
        if (!mounted) return;
        setCategories(cats);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingCats(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedCat = useMemo(
    () => categories.find((c) => c.slug === catSlug) || null,
    [catSlug, categories]
  );
  const selectedSub = useMemo(
    () =>
      selectedCat?.subs.find((s) => s.name === subName) || null,
    [selectedCat, subName]
  );
  const [priceMin] = useState<number | undefined>(
    params.get("priceMin") ? Number(params.get("priceMin")) : undefined
  );
  const [priceMax] = useState<number | undefined>(
    params.get("priceMax") ? Number(params.get("priceMax")) : undefined
  );
  const [state] = useState<string | undefined>(
    params.get("state") || undefined
  );
  const [location] = useState<string | undefined>(
    params.get("location") || undefined
  );
  const [sort] = useState<string | undefined>(
    params.get("sort") || "relevance"
  );

  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>({
    locations: [],
    states: ["new", "like-new", "good", "used"],
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    const catId = selectedCat?.id;
    const subId = selectedSub?.id;
    const { items, total, facets } = await fetchResults({
      catId,
      subId,
      page,
      limit,
      priceMin,
      priceMax,
      state,
      location,
      sort,
    });
    setItems(items);
    setTotal(total);
    setFacets(facets);
  }, [page, limit, selectedCat?.id, selectedSub?.id, priceMin, priceMax, state, location, sort]);

  useEffect(() => {
    if (selectedCat) load();
  }, [load, selectedCat]);

  const setParam = (
    key: string,
    value: string | number | undefined | null
  ) => {
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (value === undefined || value === "" || value === null) sp.delete(key);
    else sp.set(key, String(value));
    if (
      ["cat", "sub", "priceMin", "priceMax", "state", "location", "sort"].includes(
        key
      )
    )
      sp.delete("page");
    router.push("/categories?" + sp.toString(), { scroll: false });

  };

  const baseUrl =
    "/categories" +
    (catSlug ? `?cat=${catSlug}` : "") +
    (subName
      ? `${catSlug ? "&" : "?"}sub=${encodeURIComponent(subName)}`
      : "") +
    (priceMin ? `&priceMin=${priceMin}` : "") +
    (priceMax ? `&priceMax=${priceMax}` : "") +
    (state ? `&state=${state}` : "") +
    (location ? `&location=${encodeURIComponent(location)}` : "") +
    (sort && sort !== "relevance" ? `&sort=${sort}` : "");

  // State voor opengeklikte categorie
  const [openCat, setOpenCat] = useState<string | null>(null);

  return (
    <div className="container py-8 grid lg:grid-cols-4 gap-8">
      {/* Left: 1/4 width categories */}
      <aside className="card p-4 space-y-3 h-fit">
        {loadingCats ? (
          <div>Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-gray-600">
            Geen items gevonden. Controleer RLS en is_active.
          </div>
        ) : (
          categories.map((c) => {
            const isActive = c.slug === catSlug;
            const isOpen = openCat === c.slug;
            return (
              <div key={c.slug}>
                <button
                  onClick={() => setOpenCat(isOpen ? null : c.slug)}
                  className={`font-medium`}
                  aria-expanded={isOpen}
                >
                  {c.name}
                </button>
                {isOpen && (
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {c.subs?.length ? (
                      c.subs.map((s) => (
                        <li key={s.slug}>
                          <button
                            onClick={() => {
                              setParam("cat", c.slug);
                              setParam("sub", s.name);
                            }}
                            className={`hover:underline ${subName === s.name && isActive ? "font-medium" : ""}`}
                          >
                            {s.name}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">Geen subcategorieën</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </aside>

      {/* Right: 3/4 listings */}
      <section className="lg:col-span-3 space-y-4">
        <HighlightedSlider
          catName={selectedCat?.name || undefined}
          subName={subName || undefined}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {selectedCat ? selectedCat.name : "Marktplaats"}
            {subName ? ` › ${subName}` : ""}
          </h1>
          <div className="text-sm text-gray-600">{total} resultaten</div>
        </div>

        {/* Filters */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <button
              onClick={() => {
                setParam("priceMin", undefined);
                setParam("priceMax", undefined);
                setParam("state", undefined);
                setParam("location", undefined);
                setParam("sort", "relevance");
              }}
              className="text-xs text-primary hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-stretch">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Locatie
              </label>
              <select
                value={location || ""}
                onChange={(e) =>
                  setParam("location", e.target.value || undefined)
                }
                className="filter-select"
              >
                <option value="">Alle locaties</option>
                {facets.locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Staat</label>
              <select
                value={state || ""}
                onChange={(e) => setParam("state", e.target.value || undefined)}
                className="filter-select"
              >
                <option value="">Alle</option>
                {facets.states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Prijs min
              </label>
              <input
                type="number"
                value={priceMin ?? ""}
                onChange={(e) =>
                  setParam("priceMin", e.target.value || undefined)
                }
                className="filter-input"
                placeholder="€"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Prijs max
              </label>
              <input
                type="number"
                value={priceMax ?? ""}
                onChange={(e) =>
                  setParam("priceMax", e.target.value || undefined)
                }
                className="filter-input"
                placeholder="€"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">
                Sorteren
              </label>
              <select
                value={sort || "relevance"}
                onChange={(e) => setParam("sort", e.target.value || undefined)}
                className="filter-select"
              >
                <option value="relevance">Relevantie</option>
                <option value="date_desc">Nieuwste eerst</option>
                <option value="price_asc">Prijs (laag → hoog)</option>
                <option value="price_desc">Prijs (hoog → laag)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top Pagination */}
        <Pagination baseUrl={baseUrl} page={page} totalPages={totalPages} />

        <div className="card divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-2">
              <ListingRow item={item} />
            </div>
          ))}
        </div>

        {/* Bottom Pagination */}
        <Pagination baseUrl={baseUrl} page={page} totalPages={totalPages} />
      </section>
    </div>
  );
}
