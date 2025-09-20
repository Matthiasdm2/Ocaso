"use client";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function StickySearch({ noBorder = false }: { noBorder?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");

  // Sync with current query if already on a search page
  useEffect(() => {
    const current = params.get("q") || "";
    setQ(current);
  }, [params]);

  return (
    <div className={`${noBorder ? '' : 'border-t border-gray-100'} bg-white`}>
      <div className="container py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            if (!term) return;
            router.push(`/search?q=${encodeURIComponent(term)}`);
          }}
          role="search"
          aria-label="Site"
          className="relative block"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek naar producten..."
            className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            type="search"
            name="q"
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}
