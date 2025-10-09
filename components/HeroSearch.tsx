"use client";
import { Camera, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ImageSearchModal from "./ImageSearchModal";

export default function HeroSearch({ noContainer = false }: { noContainer?: boolean }) {
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const router = useRouter();

  // Suggestions from API
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [shopSuggestions, setShopSuggestions] = useState<Array<{ name: string; slug: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        } else {
          setSuggestions([]);
        }
        if (r2.ok) {
          const j2 = (await r2.json()) as { suggestions?: Array<{ name: string; slug: string }> };
          setShopSuggestions(j2.suggestions || []);
        } else {
          setShopSuggestions([]);
        }
      } catch {
        // ignore
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [q, show]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="hero-observe" className={noContainer ? "py-6 md:py-10" : "container py-6 md:py-10"}>
      <div className="card p-4 md:p-6 lg:p-10">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-bold mb-4 md:mb-6">
          Zoek nieuw of tweedehands. Slim, snel en veilig.
        </h1>
        <div className="relative flex flex-col sm:flex-row gap-3">
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const term = q.trim();
              if (!term) return;
              router.push(`/search?q=${encodeURIComponent(term)}`);
              setShow(false);
            }}
            role="search"
            aria-label="Site"
          >
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setShow(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShow(false);
                }}
                onFocus={() => setShow(true)}
                placeholder="Waar ben je naar op zoek?"
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 md:py-3 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] text-base"
                type="search"
                name="q"
                autoComplete="off"
              />
            </label>
          </form>
          <button
            onClick={() => setShowImageSearch(true)}
            className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 min-h-[44px] text-base font-medium"
          >
            <Camera className="size-5" /> Zoek op foto (AI)
          </button>

          {show && (
            <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto sm:w-[60%] bg-white rounded-xl border shadow-smooth overflow-hidden z-10 max-h-96 overflow-y-auto">
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
                      onClick={() => {
                        router.push(`/search?q=${encodeURIComponent(r)}`);
                        setShow(false);
                      }}
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
                      onClick={() => {
                        router.push(`/shop/${encodeURIComponent(s.slug)}`);
                        setShow(false);
                      }}
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
      </div>

      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
      />
    </section>
  );
}
