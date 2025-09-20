"use client";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchHeader({ total }: { total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ(params.get("q") || "");
  }, [params]);

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const term = q.trim();
    const next = new URLSearchParams(params.toString());
    if (term) next.set("q", term); else next.delete("q");
    // Reset paging if later added
    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-smooth">
      <form onSubmit={submit} className="flex flex-col gap-4 md:gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek producten, bv. 'racefiets'"
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            type="search"
            name="q"
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
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
