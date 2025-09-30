// components/CategorySelect.tsx
"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

import { createClient } from "@/lib/supabaseClient";

type Category = { id: string | number; name: string };
type Subcategory = {
  id: string | number;
  name: string;
  category_id?: string | number;
  category?: string | number;
};

type Props = {
  valueCategory: string;            // geselecteerde category.id (stringified)
  valueSubcategory: string;         // geselecteerde subcategory.id (stringified)
  onChangeCategory: (val: string) => void;
  onChangeSubcategory: (val: string) => void;
  disabled?: boolean;
};

const DROPDOWN_GAP_PX = 8;
const DROPDOWN_MAX_H_CSS = "50vh"; // visueel prettig, maar we zetten ook een px fallback

export default function CategorySelect({
  valueCategory,
  valueSubcategory,
  onChangeCategory,
  onChangeSubcategory,
  disabled,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  // Data
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Type-to-highlight (NIET filteren, lijst blijft compleet)
  const [catQuery, setCatQuery] = useState("");
  const [subQuery, setSubQuery] = useState("");
  const [openCat, setOpenCat] = useState(false);
  const [openSub, setOpenSub] = useState(false);

  // Keyboard navigatie
  const [catActive, setCatActive] = useState(0);
  const [subActive, setSubActive] = useState(0);

  // Anchors voor portal positioning
  const catInputRef = useRef<HTMLInputElement | null>(null);
  const subInputRef = useRef<HTMLInputElement | null>(null);
  const [catRect, setCatRect] = useState<DOMRect | null>(null);
  const [subRect, setSubRect] = useState<DOMRect | null>(null);

  // Refs voor list items (scroll naar active/match)
  const catItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const subItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ---------- Data laden ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id,name")
        .order("name", { ascending: true });
      if (!mounted) return;
      setCats(error ? [] : data ?? []);
      setLoadingCats(false);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    async function loadSubs(catId: string) {
      setLoadingSubs(true);

      // probeer 'category_id'
      let q = await supabase
        .from("subcategories")
        .select("id,name,category_id")
        .eq("category_id", catId)
        .order("name", { ascending: true });

      // fallback 'category'
      if (q.error) {
        // Query both 'category_id' and 'category' to ensure type compatibility
        q = await supabase
          .from("subcategories")
          .select("id,name,category_id,category")
          .eq("category", catId)
          .order("name", { ascending: true });
      }

      if (!mounted) return;

      if (!q.error) {
        setSubs(q.data ?? []);
        const valid = new Set((q.data ?? []).map((s: Subcategory) => String(s.id)));
        if (!valid.has(valueSubcategory)) onChangeSubcategory("");
      } else {
        setSubs([]);
        onChangeSubcategory("");
      }
      setLoadingSubs(false);
    }

    if (valueCategory) loadSubs(valueCategory);
    else {
      setSubs([]);
      onChangeSubcategory("");
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, valueCategory]);

  // Sync zichtbare query met huidige keuze
  useEffect(() => {
    const current = cats.find((c) => String(c.id) === String(valueCategory));
    setCatQuery(current?.name ?? "");
  }, [cats, valueCategory]);

  useEffect(() => {
    const current = subs.find((s) => String(s.id) === String(valueSubcategory));
    setSubQuery(current?.name ?? "");
  }, [subs, valueSubcategory]);

  // ---------- Helpers ----------
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const catQueryNorm = normalize(catQuery.trim());
  const subQueryNorm = normalize(subQuery.trim());

  const isCatMatch = useCallback(
    (name: string) =>
      !!catQueryNorm && normalize(name).includes(catQueryNorm),
    [catQueryNorm]
  );
  const isSubMatch = useCallback(
    (name: string) =>
      !!subQueryNorm && normalize(name).includes(subQueryNorm),
    [subQueryNorm]
  );

  const firstCatMatchIndex = useMemo(() => {
    if (!catQueryNorm) return 0;
    const idx = cats.findIndex((c) => isCatMatch(c.name));
    return idx >= 0 ? idx : 0;
  }, [cats, isCatMatch, catQueryNorm]);

  const firstSubMatchIndex = useMemo(() => {
    if (!subQueryNorm) return 0;
    const idx = subs.findIndex((s) => isSubMatch(s.name));
    return idx >= 0 ? idx : 0;
  }, [subs, isSubMatch, subQueryNorm]);

  useEffect(() => {
    if (openCat) setCatActive(firstCatMatchIndex);
  }, [openCat, firstCatMatchIndex]);
  useEffect(() => {
    if (openSub) setSubActive(firstSubMatchIndex);
  }, [openSub, firstSubMatchIndex]);

  // Scroll naar active/match (alleen in dropdown, niet window)
  useEffect(() => {
    const el = catItemRefs.current[catActive];
    if (openCat && el) el.scrollIntoView({ block: "nearest" });
  }, [catActive, openCat]);
  useEffect(() => {
    const el = subItemRefs.current[subActive];
    if (openSub && el) el.scrollIntoView({ block: "nearest" });
  }, [subActive, openSub]);

  // Select helpers
  function pickCategory(c: Category | undefined) {
    if (!c) return;
    onChangeCategory(String(c.id));
    onChangeSubcategory("");
    setCatQuery(c.name);
    setOpenCat(false);
    setSubQuery("");
  }
  function pickSubcategory(s: Subcategory | undefined) {
    if (!s) return;
    onChangeSubcategory(String(s.id));
    setSubQuery(s.name);
    setOpenSub(false);
  }

  // Auto-select exact matches
  function autoSelectCategory() {
    if (!catQuery.trim()) return;
    const exactMatch = cats.find(c => c.name.toLowerCase() === catQuery.trim().toLowerCase());
    if (exactMatch) {
      pickCategory(exactMatch);
    }
  }

  function autoSelectSubcategory() {
    if (!subQuery.trim()) return;
    const exactMatch = subs.find(s => s.name.toLowerCase() === subQuery.trim().toLowerCase());
    if (exactMatch) {
      pickSubcategory(exactMatch);
    }
  }

  // Keyboard handlers (over ALLE items)
  function onCatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openCat && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpenCat(true);
      return;
    }
    if (!cats.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCatActive((i) => Math.min(i + 1, cats.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCatActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (openCat && cats[catActive]) {
        pickCategory(cats[catActive]);
      } else {
        autoSelectCategory();
      }
    } else if (e.key === "Escape") {
      setOpenCat(false);
    }
  }
  function onSubKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openSub && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpenSub(true);
      return;
    }
    if (!subs.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSubActive((i) => Math.min(i + 1, subs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSubActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (openSub && subs[subActive]) {
        pickSubcategory(subs[subActive]);
      } else {
        autoSelectSubcategory();
      }
    } else if (e.key === "Escape") {
      setOpenSub(false);
    }
  }

  // ---- Portals positioneren: NIET in capture-mode luisteren op scroll ----
  useLayoutEffect(() => {
    function measure() {
      if (catInputRef.current) setCatRect(catInputRef.current.getBoundingClientRect());
      if (subInputRef.current) setSubRect(subInputRef.current.getBoundingClientRect());
    }
    measure();

    // Alleen window scroll/resize (geen capture) om dropdown scroll niet te storen
    let raf = 0;
    function onScrollOrResize() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // meet nieuwe rects
        const newCat = catInputRef.current?.getBoundingClientRect() || null;
        const newSub = subInputRef.current?.getBoundingClientRect() || null;

        // setState alleen bij echte verandering (voorkomt re-render-jank)
        setCatRect((prev) => {
          if (!newCat && !prev) return prev;
          if (!newCat || !prev) return newCat;
          if (
            Math.abs(newCat.left - prev.left) > 0.5 ||
            Math.abs(newCat.top - prev.top) > 0.5 ||
            Math.abs(newCat.width - prev.width) > 0.5 ||
            Math.abs(newCat.height - prev.height) > 0.5
          ) return newCat;
          return prev;
        });
        setSubRect((prev) => {
          if (!newSub && !prev) return prev;
          if (!newSub || !prev) return newSub;
          if (
            Math.abs(newSub.left - prev.left) > 0.5 ||
            Math.abs(newSub.top - prev.top) > 0.5 ||
            Math.abs(newSub.width - prev.width) > 0.5 ||
            Math.abs(newSub.height - prev.height) > 0.5
          ) return newSub;
          return prev;
        });
      });
    }

    window.addEventListener("scroll", onScrollOrResize); // geen capture
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  // Klik buiten → sluiten (maar NIET bij clicks in portal; die stoppen we met stopPropagation)
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (catInputRef.current && !catInputRef.current.contains(t)) setOpenCat(false);
      if (subInputRef.current && !subInputRef.current.contains(t)) setOpenSub(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // Dropdown via portal
  function DropdownPortal({
    rect,
    open,
    children,
  }: {
    rect: DOMRect | null;
    open: boolean;
    children: React.ReactNode;
  }) {
    if (!open || !rect) return null;

    // Positionering onder het inputveld
    const style: React.CSSProperties = {
      position: "fixed",
      top: rect.bottom + DROPDOWN_GAP_PX,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    };

    return createPortal(
      <div
        style={style}
        className="pointer-events-auto"
        // cruciaal: voorkom dat document-mousedown handler dit als 'outside' ziet
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>,
      document.body
    );
  }

  // Tekst highlighten zonder items te verbergen
  function renderHighlighted(name: string, queryNorm: string) {
    if (!queryNorm) return name;
    const nName = normalize(name);
    const idx = nName.indexOf(queryNorm);
    if (idx === -1) return name;
    const before = name.slice(0, idx);
    const match = name.slice(idx, idx + queryNorm.length);
    const after = name.slice(idx + queryNorm.length);
    return (
      <>
        {before}
        <mark className="bg-emerald-100 rounded px-0.5">{match}</mark>
        {after}
      </>
    );
  }

  // ---------------- UI ----------------
  return (
    <div className="space-y-3">
  {/* Marktplaats-categorie */}
      <div className="relative">
  <label className="text-xs font-medium text-gray-600">Marktplaats-categorie</label>
        <div className="mt-1 relative">
          <input
            ref={catInputRef}
            value={catQuery}
            onChange={(e) => {
              setCatQuery(e.target.value);
              setOpenCat(true);
              if (cats.length) setCatActive(firstCatMatchIndex);
            }}
            onFocus={() => setOpenCat(true)}
            onBlur={() => {
              setTimeout(() => autoSelectCategory(), 100); // Delay to allow click events
            }}
            onKeyDown={onCatKeyDown}
            placeholder={loadingCats ? "Laden…" : "Typ om te zoeken… (lijst blijft volledig)"}
            disabled={disabled}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 pr-8 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
          />
          {valueCategory && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChangeCategory("");
                onChangeSubcategory("");
                setCatQuery("");
                setSubQuery("");
                setOpenCat(false);
                setOpenSub(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Portal: complete lijst (scrollbaar) */}
      <DropdownPortal rect={catRect} open={openCat && !disabled}>
        <div
          className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-y-auto [scrollbar-gutter:stable]"
          style={{
            maxHeight: DROPDOWN_MAX_H_CSS,
            WebkitOverflowScrolling: "touch", // iOS soepel scrollen
          }}
        >
          {loadingCats ? (
            <div className="px-3 py-2 text-sm text-gray-500">Laden…</div>
          ) : cats.length ? (
            cats.map((c, idx) => {
              const active = idx === catActive;
              const match = isCatMatch(c.name);
              return (
                <button
                  key={String(c.id)}
                  ref={(el) => (catItemRefs.current[idx] = el)}
                  type="button"
                  onClick={() => pickCategory(c)}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 ${
                    active ? "bg-emerald-50" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{renderHighlighted(c.name, catQueryNorm)}</span>
                    {match && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px]">
                        match
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">Geen marktplaats-categorieën</div>
          )}
        </div>
      </DropdownPortal>

  {/* Marktplaats-subcategorie */}
      <div className="relative">
  <label className="text-xs font-medium text-gray-600">Marktplaats-subcategorie (optioneel)</label>
        <div className="mt-1 relative">
          <input
            ref={subInputRef}
            value={subQuery}
            onChange={(e) => {
              setSubQuery(e.target.value);
              setOpenSub(true);
              if (subs.length) setSubActive(firstSubMatchIndex);
            }}
            onFocus={() => setOpenSub(true)}
            onBlur={() => {
              setTimeout(() => autoSelectSubcategory(), 100); // Delay to allow click events
            }}
            onKeyDown={onSubKeyDown}
            placeholder={
              !valueCategory
                ? "Kies eerst een marktplaats-categorie"
                : loadingSubs
                ? "Laden…"
                : subs.length
                ? "Typ om te zoeken… (lijst blijft volledig)"
                : "Geen marktplaats-subcategorieën voor deze marktplaats-categorie"
            }
            disabled={disabled || !valueCategory || loadingSubs || subs.length === 0}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 pr-8 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
          />
          {valueSubcategory && !disabled && valueCategory && (
            <button
              type="button"
              onClick={() => {
                onChangeSubcategory("");
                setSubQuery("");
                setOpenSub(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Portal: complete sub-lijst (scrollbaar) */}
      <DropdownPortal rect={subRect} open={openSub && !!valueCategory && !disabled}>
        <div
          className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-y-auto [scrollbar-gutter:stable]"
          style={{
            maxHeight: DROPDOWN_MAX_H_CSS,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {loadingSubs ? (
            <div className="px-3 py-2 text-sm text-gray-500">Laden…</div>
          ) : subs.length ? (
            subs.map((s, idx) => {
              const active = idx === subActive;
              const match = isSubMatch(s.name);
              return (
                <button
                  key={String(s.id)}
                  ref={(el) => (subItemRefs.current[idx] = el)}
                  type="button"
                  onClick={() => pickSubcategory(s)}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 ${
                    active ? "bg-emerald-50" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{renderHighlighted(s.name, subQueryNorm)}</span>
                    {match && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px]">
                        match
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">Geen marktplaats-subcategorieën</div>
          )}
        </div>
      </DropdownPortal>
    </div>
  );
}
