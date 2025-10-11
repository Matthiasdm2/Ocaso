"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import CollapsibleContainer from "@/components/CollapsibleContainer";
import ListingCard from "@/components/ListingCard";
import { createClient } from "@/lib/supabaseClient";

/* =================== Types =================== */
type Biz = {
  id: string;
  name: string;
  shopName?: string | null;
  categories: string[];
  city: string;
  rating: number;
  reviews: number;
  subscriptionActive: boolean;
  logoUrl?: string | null;
  listings?: Listing[];
  // raw optional fields (not always present but may be in API response if expanded later)
  company_name?: string | null;
  shop_name?: string | null;
  full_name?: string | null;
};

type Listing = {
  id: string;
  title: string;
  price?: number;
  imageUrl?: string | null;
  status?: string;
};

type Product = {
  id: string;
  title: string;
  price?: number | null;
  imageUrl?: string | null;
  status?: string | null;
  sellerId: string;
  sellerName: string;
  sellerCity: string;
};

type CategorySidebarCategory = {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string; slug: string }[];
};

/* =================== Utils =================== */
const cls = (...a: (string | false | undefined)[]) =>
  a.filter(Boolean).join(" ");

/* =================== Client Component =================== */
export default function BusinessListClient({ categories }: { categories: CategorySidebarCategory[] }) {
  // Categorie & subcategorie state
  // Zoekcategorie in de horizontale balk
  const [searchCategory, setSearchCategory] = useState<"business" | "product">(
    "business",
  );
  // Query + filters
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Data
  const [data, setData] = useState<{
    businesses: Biz[];
  products: Product[];
    cats: string[];
    cities: string[];
  }>({
    businesses: [],
  products: [],
    cats: [],
    cities: [],
  });
  const [loading, setLoading] = useState(true);

  // Foto-zoek
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Fetch ---------- */
  const supabase = useRef(createClient()).current;

  const fetchData = useCallback(async () => {
    setLoading(true);

    const p = new URLSearchParams();
    p.set("mode", searchCategory); // 'business' | 'product'
    if (q) p.set("q", q);
    if (selectedCategory) p.set("cat", selectedCategory);
    if (selectedSubcategory) p.set("subcat", selectedSubcategory);
    if (selectedLocation) p.set("city", selectedLocation);

    const res = await fetch("/api/businesses?" + p.toString(), {
      cache: "no-store",
    });
    const json = await res.json();
    // Mode based mapping
    const enrichedBusinesses: Biz[] = Array.isArray(json.businesses)
      ? (json.businesses as Partial<Biz>[]).map((b) => {
          const shopName = b.shopName || b.shop_name || b.company_name || b.full_name || b.name || null;
          return { ...(b as Biz), shopName };
        })
      : [];
    const products: Product[] = Array.isArray(json.products)
      ? (json.products as Product[])
      : [];
    setData({ businesses: enrichedBusinesses, products, cats: json.cats || [], cities: json.cities || [] });
    setLoading(false);
  }, [searchCategory, q, selectedCategory, selectedSubcategory, selectedLocation]);

  useEffect(() => {
    // initial fetch
    fetchData();
    // periodic refresh for more up-to-date review counts
    const interval = setInterval(fetchData, 20000); // 20s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Realtime updates: subscribe to review changes for the currently listed businesses
  useEffect(() => {
    if (!data.businesses.length) return;
    const ids = data.businesses.map(b => b.id).join(',');
    // If too many IDs, fallback to interval strategy only
    if (ids.length > 800) return; // safeguard
    const channel = supabase
      .channel('biz-reviews-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=in.(${ids})`
      }, () => {
        // lightweight debounce to avoid burst refetches
        setTimeout(fetchData, 300);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [data.businesses, supabase, fetchData]);

  // debounce op zoek & filters
  useEffect(() => {
    const id = setTimeout(fetchData, 300);
    return () => clearTimeout(id);
  }, [fetchData]);

  // Reset subcategorie wanneer categorie verandert
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedSubcategory("");
    }
  }, [selectedCategory]);

  /* ---------- Handlers ---------- */
  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  async function handleImageSearch(file: File) {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/search/image", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (json.query) setQ(json.query);
      setSearchCategory("product"); // Foto → product-zoek
      setData({
        businesses: Array.isArray(json.businesses) ? json.businesses : [],
        products: Array.isArray(json.products) ? json.products : [],
        cats: json.cats || data.cats,
        cities: json.cities || data.cities,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }


  /* ---------- Render ---------- */
  return (
    <div className="container py-8">
      {/* HERO + HORIZONTALE ZOEKBALK */}
      <section className="card p-6 sm:p-7 space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Zakelijke handelaars
            </h1>
            <p className="text-sm text-gray-600">
              Zoek op handelaar of product. Tip: je kan ook zoeken met een foto
              (AI).
            </p>
          </div>
          <div className="hidden lg:flex text-sm text-gray-500">
            Modus:&nbsp;
            <span className="font-medium">
              {searchCategory === "business" ? "Handelaars" : "Producten"}
            </span>
          </div>
        </div>

        {/* HORIZONTALE ZOEKBALK (zelfde patroon als voorpagina) */}
        <form onSubmit={onSubmitSearch} className="w-full">
          <div className="flex flex-col md:flex-row gap-2">
            {/* Keuze: Handelaar / Product */}
            <div className="flex rounded-xl border border-gray-200 bg-white p-1 w-full md:w-auto">
              <TabChip
                active={searchCategory === "business"}
                onClick={() => setSearchCategory("business")}
              >
                Handelaars
              </TabChip>
              <TabChip
                active={searchCategory === "product"}
                onClick={() => setSearchCategory("product")}
              >
                Producten
              </TabChip>
            </div>

            {/* Zoekveld */}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                searchCategory === "business"
                  ? "Zoek op handelaar…"
                  : "Zoek op product…"
              }
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />

            {/* Zoeken-knop */}
            <button
              type="submit"
              className="rounded-xl bg-primary text-black px-5 py-3 font-medium"
            >
              Zoeken
            </button>

            {/* Foto (AI) knop */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"
              title="Zoek op foto (AI)"
            >
              <CameraIcon />
              Foto (AI)
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageSearch(f);
              }}
            />
          </div>
        </form>
      </section>

      {/* MAIN CONTENT: SIDEBAR + RESULTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* SIDEBAR: FILTERS - hidden on mobile */}
        <div className="hidden md:block">
          <aside className="card p-4 space-y-6">
            {/* Locatie filter */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Locatie</h3>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Alle locaties</option>
                {data.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Categorieën */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Categorieën</h3>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    selectedCategory === ""
                      ? "bg-primary text-black font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  Alle categorieën
                </button>
                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedCategory(selectedCategory === cat.name ? "" : cat.name);
                        setSelectedSubcategory("");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedCategory === cat.name
                          ? "bg-primary text-black font-medium"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                    {selectedCategory === cat.name && cat.subcategories.length > 0 && (
                      <div className="ml-4 space-y-1">
                        <button
                          onClick={() => setSelectedSubcategory("")}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                            selectedSubcategory === ""
                              ? "bg-primary text-black font-medium"
                              : "hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          Alle subcategorieën
                        </button>
                        {cat.subcategories.map((subcat) => (
                          <button
                            key={subcat.id}
                            onClick={() => setSelectedSubcategory(selectedSubcategory === subcat.name ? "" : subcat.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                              selectedSubcategory === subcat.name
                                ? "bg-primary text-black font-medium"
                                : "hover:bg-gray-50 text-gray-600"
                            }`}
                          >
                            {subcat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reset filters button */}
            {(selectedCategory || selectedSubcategory || selectedLocation) && (
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedSubcategory("");
                  setSelectedLocation("");
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                Filters wissen
              </button>
            )}
          </aside>
        </div>

        {/* RESULTS */}
        <main className="md:col-span-3 space-y-4 pt-[2px]">
          {/* Filters & Categories - visible on mobile/tablet */}
          <div className="block md:hidden">
            <CollapsibleContainer
              title="Filters & Categorieën"
              defaultOpenDesktop={false}
              defaultOpenMobile={false}
              elevation="flat"
              className="relative"
            >
              <div className="-mt-1">
                <div className="card p-4 space-y-6">
                  {/* Locatie filter */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-gray-700">Locatie</h3>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      <option value="">Alle locaties</option>
                      {data.cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Categorieën */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-gray-700">Categorieën</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setSelectedCategory("");
                          setSelectedSubcategory("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          selectedCategory === ""
                            ? "bg-primary text-black font-medium"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        Alle categorieën
                      </button>
                      {categories.map((cat) => (
                        <div key={cat.id} className="space-y-1">
                          <button
                            onClick={() => {
                              setSelectedCategory(selectedCategory === cat.name ? "" : cat.name);
                              setSelectedSubcategory("");
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                              selectedCategory === cat.name
                                ? "bg-primary text-black font-medium"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            {cat.name}
                          </button>
                          {selectedCategory === cat.name && cat.subcategories.length > 0 && (
                            <div className="ml-4 space-y-1">
                              <button
                                onClick={() => setSelectedSubcategory("")}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                  selectedSubcategory === ""
                                    ? "bg-primary text-black font-medium"
                                    : "hover:bg-gray-50 text-gray-600"
                                }`}
                              >
                                Alle subcategorieën
                              </button>
                              {cat.subcategories.map((subcat) => (
                                <button
                                  key={subcat.id}
                                  onClick={() => setSelectedSubcategory(selectedSubcategory === subcat.name ? "" : subcat.name)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                    selectedSubcategory === subcat.name
                                      ? "bg-primary text-black font-medium"
                                      : "hover:bg-gray-50 text-gray-600"
                                  }`}
                                >
                                  {subcat.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filters wissen */}
                  {(selectedCategory || selectedSubcategory || selectedLocation) && (
                    <button
                      onClick={() => {
                        setSelectedCategory("");
                        setSelectedSubcategory("");
                        setSelectedLocation("");
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Filters wissen
                    </button>
                  )}
                </div>
              </div>
            </CollapsibleContainer>
          </div>
          <section className="space-y-3">
            <div className="text-sm text-gray-600">
              {loading
                ? "Laden…"
                : searchCategory === "product"
                ? `${data.products.length} producten`
                : `${data.businesses.length} handelaars`}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : searchCategory === "product" ? (
              data.products.length === 0 ? (
                <EmptyState mode={searchCategory} q={q} />
              ) : (
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {data.products.map((p) => (
                    <li key={p.id}>
                      <ListingCard
                        listing={{
                          id: p.id,
                          title: p.title,
                          price: p.price ?? 0,
                          images: p.imageUrl ? [p.imageUrl] : undefined,
      }}
      noClampTitle
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : data.businesses.length === 0 ? (
              <EmptyState mode={searchCategory} q={q} />
            ) : (
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {data.businesses.map((b) => (
                  <li key={b.id}>
                    <BizCard biz={b} />
                    {Array.isArray(b.listings) && b.listings.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium mb-2 text-sm text-primary">Aanbod van deze handelaar:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                          {b.listings.map((l: Listing) => (
                            l.imageUrl ? (
                              <ListingCard
                                key={l.id}
                                listing={{
                                  id: l.id,
                                  title: l.title,
                                  price: l.price ?? 0,
                                  images: [l.imageUrl],
                                }}
                              />
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

/* =================== UI bouwstenen =================== */

function TabChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        "px-3 py-2 text-sm rounded-lg transition",
        active ? "bg-primary text-black" : "bg-transparent hover:bg-gray-100",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="card p-5 space-y-3 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-56 bg-gray-100 rounded" />
          <div className="h-6 w-36 bg-gray-100 rounded" />
          <div className="h-8 w-24 bg-gray-200 rounded ml-auto" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ mode, q }: { mode: "business" | "product"; q: string }) {
  return (
    <div className="card p-10 text-center text-sm text-gray-600">
      <div className="text-base font-medium text-gray-800 mb-1">
        Geen resultaten
      </div>
      <p className="mb-4">
        {q ? (
          mode === "product" ? (
            <>
              Geen producten gevonden bij zakelijke verkopers{q ? (
                <> voor <span className="font-medium">&quot;{q}&quot;</span></>
              ) : null}.
            </>
          ) : (
            <>
              Geen handelaars gevonden met{" "}
              <span className="font-medium">&quot;{q}&quot;</span> in naam.
            </>
          )
        ) : (
          "Pas je filters aan of probeer een andere zoekterm."
        )}
      </p>
      <div className="inline-flex gap-2">
        <Link href="/explore" className="rounded-xl border px-3 py-2 text-sm">
          Verken aanbod
        </Link>
        <Link
          href="/business"
          className="rounded-xl bg-primary text-black px-3 py-2 text-sm"
        >
          Bekijk alle handelaars
        </Link>
      </div>
    </div>
  );
}

function BizCard({ biz }: { biz: Biz }) {
  return (
    <Link
      href={`/business/${biz.id}`}
      className={cls(
        "group relative block rounded-2xl border bg-white shadow-sm transition hover:shadow-md border-neutral-200"
      )}
    >
      {/* Logo bovenaan */}
      <div className="w-full aspect-[4/3] overflow-hidden bg-neutral-100 rounded-t-2xl">
        <Image
          src={biz.logoUrl || "/placeholder.png"}
          alt={biz.shopName || biz.name || "Logo"}
          width={400}
          height={300}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>

      {/* Informatie eronder */}
      <div className="p-4">
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold text-neutral-900 line-clamp-2 text-sm mb-1">
              {biz.shopName || biz.name}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {biz.city} • {biz.categories.join(", ")}
            </p>
          </div>

          {/* Rating en reviews */}
          <div className="flex items-center gap-1 text-[13px] text-amber-400">
            <Stars rating={biz.rating} />
            <span className="font-medium text-gray-800">{biz.rating.toFixed(1)}</span>
            <span className="text-gray-500">({biz.reviews})</span>
          </div>

          {/* Subscription status */}
          <div className="flex items-center justify-between">
            {biz.subscriptionActive && (
              <span
                className={cls(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  "bg-primary/15 text-primary"
                )}
              >
                Zakelijk actief
              </span>
            )}

            <div className="text-primary text-sm font-medium flex items-center gap-1">
              Bekijk
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <span className="inline-flex items-center text-amber-400">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={"f" + i} type="full" />
      ))}
      {hasHalf && <Star type="half" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={"e" + i} type="empty" />
      ))}
    </span>
  );
}

function Star({ type }: { type: "full" | "half" | "empty" }) {
  if (type === "full") {
    return (
      <svg
        className="w-4 h-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.05 2.927a1 1 0 011.9 0l1.13 3.484a1 1 0 00.95.69h3.66c.97 0 1.37 1.24.59 1.81l-2.96 2.15a1 1 0 00-.36 1.12l1.13 3.48c.3.93-.76 1.69-1.55 1.12l-2.96-2.15a1 1 0 00-1.18 0l-2.96 2.15c-.79.57-1.85-.19-1.55-1.12l1.13-3.48a1 1 0 00-.36-1.12L2.72 8.91c-.78-.57-.38-1.81.59-1.81h3.66a1 1 0 00.95-.69l1.13-3.484z" />
      </svg>
    );
  }
  if (type === "half") {
    return (
      <svg className="w-4 h-4" viewBox="0 0 20 20" aria-hidden="true">
        <defs>
          <linearGradient id="half">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          fill="url(#half)"
          d="M9.05 2.927a1 1 0 011.9 0l1.13 3.484a1 1 0 00.95.69h3.66c.97 0 1.37 1.24.59 1.81l-2.96 2.15a1 1 0 00-.36 1.12l1.13 3.48c.3.93-.76 1.69-1.55 1.12l-2.96-2.15a1 1 0 00-1.18 0l-2.96 2.15c-.79.57-1.85-.19-1.55-1.12l1.13-3.48a1 1 0 00-.36-1.12L2.72 8.91c-.78-.57-.38-1.81.59-1.81h3.66a1 1 0 00.95-.69l1.13-3.484z"
        />
        <path
          stroke="currentColor"
          strokeWidth="0.8"
          fill="none"
          d="M9.05 2.927a1 1 0 011.9 0l1.13 3.484a1 1 0 00.95.69h3.66c.97 0 1.37 1.24.59 1.81l-2.96 2.15a1 1 0 00-.36 1.12l1.13 3.48c.3.93-.76 1.69-1.55 1.12l-2.96-2.15a1 1 0 00-1.18 0l-2.96 2.15c-.79.57-1.85-.19-1.55-1.12l1.13-3.48a1 1 0 00-.36-1.12L2.72 8.91c-.78-.57-.38-1.81.59-1.81h3.66a1 1 0 00.95-.69l1.13-3.484z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-4 h-4 text-gray-300"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.05 2.927a1 1 0 011.9 0l1.13 3.484a1 1 0 00.95.69h3.66c.97 0 1.37 1.24.59 1.81l-2.96 2.15a1 1 0 00-.36 1.12l1.13 3.48c.3.93-.76 1.69-1.55 1.12l-2.96-2.15a1 1 0 00-1.18 0l-2.96 2.15c-.79.57-1.85-.19-1.55-1.12l1.13-3.48a1 1 0 00-.36-1.12L2.72 8.91c-.78-.57-.38-1.81.59-1.81h3.66a1 1 0 00.95-.69l1.13-3.484z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      fill="none"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h2l2-3h10l2 3h2v14H3V7z"
      />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
