"use client";
import { Camera, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "./Toast";

const MOCK = [
  "iPhone 13",
  "Moderne sofa",
  "DSLR camera",
  "Mountain bike",
  "Elektrische step",
  "AirPods Pro",
];

export default function HeroSearch({ noContainer = false }: { noContainer?: boolean }) {
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const { push } = useToast();
  const router = useRouter();
  const results = useMemo(
    () =>
      MOCK.filter((x) => x.toLowerCase().includes(q.toLowerCase())).slice(0, 5),
    [q],
  );

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
            onClick={() => push("Foto-zoek (AI) demo — nog te koppelen.")}
            className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 min-h-[44px] text-base font-medium"
          >
            <Camera className="size-5" /> Zoek op foto (AI)
          </button>

          {show && q && (
            <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto sm:w-[60%] bg-white rounded-xl border shadow-smooth overflow-hidden z-10 max-h-60 overflow-y-auto">
              {results.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-600">
                  Geen suggesties
                </div>
              )}
              {results.map((r) => (
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
        </div>
      </div>
    </section>
  );
}
