"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import ListingCard from "@/components/ListingCard";

export interface BusinessListing {
  id: string;
  title: string;
  price: number;
  images?: string[] | null;
  created_at?: string | null;
  views?: number | null;
  favorites?: number | null;
  category?: string;
  subcategory?: string;
}

interface Props {
  listings: BusinessListing[];
  title?: string;
}

export default function BusinessListingsSection({ listings, title = "Aanbod" }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [cat, setCat] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);

  // Normalization helper (shared)
  const normStr = (v?: string | null) =>
    (v ?? "")
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[\s\u00A0]+/g, " ")
      .trim()
      .toLowerCase();

  // Build category -> subcategories with counts for nicer UI (chips)
  const categoryData = useMemo(() => {
    const catMap: Record<string, { count: number; subs: Record<string, number> }> = {};
    for (const l of listings) {
      if (!l.category) continue;
      if (!catMap[l.category]) catMap[l.category] = { count: 0, subs: {} };
      catMap[l.category].count += 1;
      if (l.subcategory) {
        catMap[l.category].subs[l.subcategory] = (catMap[l.category].subs[l.subcategory] || 0) + 1;
      }
    }
    const categories = Object.entries(catMap)
      .map(([name, v]) => ({ name, count: v.count, subs: Object.entries(v.subs).map(([sn, c]) => ({ name: sn, count: c })) }))
      .sort((a,b)=> a.name.localeCompare(b.name));
    return { categories };
  }, [listings]);

  const activeCategory = useMemo(() => {
    if (!cat) return null;
    const n = normStr(cat);
    return categoryData.categories.find(c => normStr(c.name) === n) || null;
  }, [cat, categoryData]);

  const filtered = useMemo(() => {
    let arr = [...listings];
    if (cat) {
      const c = normStr(cat);
      arr = arr.filter(l => normStr(l.category) === c);
    }
    if (sub) {
      const s = normStr(sub);
      const before = arr.length;
      arr = arr.filter(l => normStr(l.subcategory) === s);
      // If nothing matched but we still have items in the selected category, attempt loose includes match as fallback
      if (arr.length === 0 && before > 0) {
        arr = listings.filter(l => (!cat || normStr(l.category) === normStr(cat)) && normStr(l.subcategory).includes(s));
      }
    }
    if (query.trim()) arr = arr.filter(l => l.title.toLowerCase().includes(query.toLowerCase()));
    switch (sort) {
      case "price-asc": arr.sort((a,b)=> (a.price??0)-(b.price??0)); break;
      case "price-desc": arr.sort((a,b)=> (b.price??0)-(a.price??0)); break;
      default: arr.sort((a,b)=> new Date(b.created_at??0).getTime() - new Date(a.created_at??0).getTime());
    }
    return arr;
  }, [listings, query, sort, cat, sub]);

  return (
    <section className="space-y-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-neutral-500">{filtered.length} zoekertje{filtered.length===1?"":"s"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {categoryData.categories.length > 0 && (
              <>
                <label className="flex items-center gap-1">
                  <span className="sr-only">Categorie</span>
                  <select
                    value={cat ?? ""}
                    onChange={e => { const v = e.target.value || null; setCat(v); setSub(null); }}
                    className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[10rem]"
                  >
                    <option value="">Alle categorieën ({listings.length})</option>
                    {categoryData.categories.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <span className="sr-only">Subcategorie</span>
                  <select
                    value={sub ?? ""}
                    disabled={!activeCategory || activeCategory.subs.length === 0}
                    onChange={e => setSub(e.target.value || null)}
                    className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[10rem] disabled:opacity-40"
                  >
                    <option value="">Alle subcategorieën{activeCategory ? ` (${activeCategory.subs.reduce((a,b)=>a+b.count,0)})` : ''}</option>
                    {activeCategory?.subs.map(s => (
                      <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <input
              type="text"
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Zoek..."
              className="h-8 w-40 rounded-md border border-neutral-300 bg-white pl-2 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={sort}
              onChange={e=>setSort(e.target.value)}
              className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Sorteer"
            >
              <option value="recent">Recent</option>
              <option value="price-asc">Prijs ↑</option>
              <option value="price-desc">Prijs ↓</option>
            </select>
            {(query || cat || sub) && (
              <button
                onClick={() => { setQuery(""); setCat(null); setSub(null); }}
                className="h-8 rounded-md border border-transparent bg-neutral-100 px-3 text-neutral-600 transition hover:bg-neutral-200"
              >Reset</button>
            )}
          </div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-neutral-500">Geen resultaten.</div>
      ) : (
        <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map(l => (
            <li key={l.id}><ListingCard listing={{ id:l.id, title:l.title, price:l.price, images:l.images, created_at:l.created_at, views:l.views, favorites:l.favorites }} /></li>
          ))}
        </ul>
      )}
      {filtered.length > 0 && (
        <div className="text-right">
          <Link href={`/search?business=${encodeURIComponent('1')}`} className="text-sm text-primary hover:underline">Meer zoeken</Link>
        </div>
      )}
    </section>
  );
}
