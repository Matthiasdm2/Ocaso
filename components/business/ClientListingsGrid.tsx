"use client";

import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type Listing = {
  id: string;
  title: string;
  price: number;
  imageUrl?: string | null;
  images?: string[];
  thumb?: string | null;
  condition?: "nieuw" | "zo goed als nieuw" | "goed" | "gebruikt";
  isFeatured?: boolean;
  isInStock?: boolean;
  createdAt?: string;
  category?: string;
  subcategory?: string;
};

import { formatPrice } from "@/lib/formatPrice";


export default function ClientListingsGrid({ initial }: { initial: Listing[] }) {
  // Protect against null/undefined initial data
  const safeInitial = useMemo(() => Array.isArray(initial) ? initial : [], [initial]);
  // Dynamisch laden van categorieën en subcategorieën uit Supabase
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );


  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    let mounted = true;
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
        console.error("fetchCategories error:", error);
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
              .filter((s: Subcategory) => s?.is_active !== false)
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
  }, [supabase]);

  const defaultSort = "recent";

  const [mainCat, setMainCat] = useState<string>("");
  const [subCat, setSubCat] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("");
  const [sort, setSort] = useState<string>(defaultSort);
  const [inStock, setInStock] = useState(false);

  function handleReset() {
  setMainCat("");
  setSubCat("");
    setMinPrice("");
    setMaxPrice("");
    setQuery("");
    setCat("");
    setSort(defaultSort);
    setInStock(false);
  }


  const filtered = useMemo(() => {
    let arr = [...safeInitial];
    if (query.trim()) arr = arr.filter(l => l.title.toLowerCase().includes(query.toLowerCase()));
    if (mainCat) arr = arr.filter(l => l.category === mainCat);
    if (subCat) arr = arr.filter(l => l.subcategory === subCat);
    if (cat) arr = arr.filter(l => l.category === cat);
    if (minPrice) arr = arr.filter(l => (l.price ?? 0) >= Number(minPrice));
    if (maxPrice) arr = arr.filter(l => (l.price ?? 0) <= Number(maxPrice));
    if (inStock) arr = arr.filter(l => l.isInStock !== false);
    switch (sort) {
      case "price-asc": arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price-desc": arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case "featured": arr.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)); break;
      default: arr.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    return arr;
  }, [safeInitial, query, mainCat, subCat, cat, minPrice, maxPrice, sort, inStock]);

  return (
    <div className="space-y-3">
      {/* Filters - overgenomen uit categories/page */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-primary hover:underline"
          >
            Reset
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-stretch">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Zoek</label>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="filter-input"
              placeholder="Zoek binnen aanbod..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Categorie</label>
            <select value={mainCat} onChange={e => { setMainCat(e.target.value); setSubCat(categories.find(opt => opt.name === e.target.value)?.subs[0]?.name || ""); }} className="filter-select" disabled={loadingCats || categories.length === 0}>
              <option value="">Alle categorieën</option>
              {categories.map(opt => (
                <option key={opt.name} value={opt.name}>{opt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Subcategorie</label>
            <select value={subCat} onChange={e => setSubCat(e.target.value)} className="filter-select" disabled={loadingCats || !mainCat}>
              <option value="">Alle subcategorieën</option>
              {categories.find(c => c.name === mainCat)?.subs.map(sub => (
                <option key={sub.name} value={sub.name}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Prijs min</label>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="filter-input"
              placeholder="€"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Prijs max</label>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="filter-input"
              placeholder="€"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sorteren</label>
            <select value={sort} onChange={e => setSort(e.target.value)} className="filter-select">
              <option value="recent">Recent</option>
              <option value="price-asc">Prijs (laag → hoog)</option>
              <option value="price-desc">Prijs (hoog → laag)</option>
              <option value="featured">Uitgelicht</option>
            </select>
          </div>
        </div>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
        {filtered.map(x => (
          <article key={x.id} className="rounded-lg border overflow-hidden hover:shadow-sm transition p-2">
            <Link href={`/listings/${x.id}`} className="block relative aspect-square bg-gray-50 group">
              {Array.isArray(x.images) && x.images.length > 0 && typeof x.images[0] === "string" && x.images[0] ? (
                <Image src={x.images[0]} alt={x.title} fill className="object-cover group-hover:opacity-80 transition" />
              ) : x.thumb ? (
                <Image src={x.thumb} alt={x.title} fill className="object-cover group-hover:opacity-80 transition" />
              ) : x.imageUrl ? (
                <Image src={x.imageUrl} alt={x.title} fill className="object-cover group-hover:opacity-80 transition" />
              ) : null}
              {x.isFeatured ? (
                <span className="absolute top-1 left-1 px-1 py-0.5 text-[10px] rounded bg-black/70 text-white">Uitgelicht</span>
              ) : null}
            </Link>
            <div className="p-2">
              <Link href={`/listings/${x.id}`} className="font-medium line-clamp-2 min-h-[2.2rem] text-sm hover:underline block">
                {x.title}
              </Link>
              <div className="mt-1 text-sm text-gray-600">
                {x.condition ? <span className="capitalize">{x.condition}</span> : <span>—</span>}
                {x.category ? <span> • {x.category}</span> : null}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-base font-semibold">{formatPrice(x.price ?? 0)}</div>
                <Link href={`/listings/${x.id}`} className="btn btn-xs">Bekijken</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-gray-600">Geen resultaten voor je filters.</div>
      ) : null}
    </div>
  );
}
