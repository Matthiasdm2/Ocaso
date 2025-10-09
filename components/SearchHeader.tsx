"use client";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function SearchHeader({ total }: { total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [shopSuggestions, setShopSuggestions] = useState<Array<{ name: string; slug: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(params.get("q") || "");
  }, [params]);

  useEffect(() => {
    if (!show) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const url1 = `/api/search/suggest?q=${encodeURIComponent(q)}&limit=8`;
        const url2 = `/api/search/suggest/shops?q=${encodeURIComponent(q)}&limit=6`;
        const [r1, r2] = await Promise.all([
          fetch(url1, { signal: ac.signal }),
          fetch(url2, { signal: ac.signal }),
        ]);
        if (r1.ok) {
          const j1 = (await r1.json()) as { suggestions?: string[] };
          setSuggestions(j1.suggestions || []);
        } else setSuggestions([]);
        if (r2.ok) {
          const j2 = (await r2.json()) as { suggestions?: Array<{ name: string; slug: string }> };
          setShopSuggestions(j2.suggestions || []);
        } else setShopSuggestions([]);
      } catch {
        // ignore
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [q, show]);

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const term = q.trim();
    const next = new URLSearchParams(params.toString());
    if (term) next.set("q", term); else next.delete("q");
    next.delete("page");
    next.delete("ids");
    router.push(`/search?${next.toString()}`);
    setShow(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-smooth">
      <form onSubmit={submit} className="flex flex-col gap-4 md:gap-3 md:flex-row md:items-center relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setShow(true); }}
            onFocus={() => setShow(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShow(false); }}
            placeholder="Zoek producten of shops, bv. 'racefiets' of 'Fietsen De Smet'"
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            type="search"
            name="q"
            autoComplete="off"
          />
          {show && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl border shadow-smooth overflow-hidden z-10 max-h-96 overflow-y-auto">
              {suggestions.length === 0 && shopSuggestions.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-600">Geen suggesties</div>
              )}
              {suggestions.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase text-gray-500">Producten</div>
                  {suggestions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setQ(r); submit(); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm min-h-[44px] flex items-center"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {shopSuggestions.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase text-gray-500">Shops</div>
                  {shopSuggestions.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => { router.push(`/shop/${encodeURIComponent(s.slug)}`); setShow(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm min-h-[44px] flex items-center"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{total} resultaten</span>
          <button
            type="submit"
            className="rounded-xl bg-primary text-black font-medium px-5 py-2 text-sm shadow-sm hover:opacity-90"
          >Zoeken</button>
        </div>
      </form>
    </div>
  );
}
