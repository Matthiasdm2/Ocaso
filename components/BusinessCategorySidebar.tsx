"use client";
import Link from "next/link";
import { useMemo } from "react";

export type BusinessCategory = {
  id: number;
  name: string;
};

export default function BusinessCategorySidebar({
  categories,
  searchParams,
}: {
  categories: BusinessCategory[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const activeCatId = useMemo(() => {
    const raw = typeof searchParams.cat === "string" ? searchParams.cat : undefined;
    const n = raw && !Number.isNaN(Number(raw)) ? Number(raw) : undefined;
    return n;
  }, [searchParams]);

  return (
    <aside className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 h-fit">
      <h2 className="text-xl font-bold mb-4 text-primary">Categorieën</h2>
      <ul className="space-y-1">
        {categories.length === 0 ? (
          <li className="text-gray-400">Geen categorieën gevonden.</li>
        ) : (
          <>
            <li>
              {(() => {
                const p = new URLSearchParams();
                Object.entries(searchParams).forEach(([k, v]) => {
                  if (typeof v === "string") p.set(k, v);
                });
                p.delete("cat");
                const href = "?" + p.toString();
                const active = !activeCatId;
                return (
                  <Link
                    scroll={false}
                    href={href}
                    className={
                      active
                        ? "w-full text-left px-4 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-primary truncate bg-primary text-white shadow"
                        : "w-full text-left px-4 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-primary truncate text-gray-800 hover:bg-primary/10"
                    }
                  >
                    <span className="truncate">Alle</span>
                  </Link>
                );
              })()}
            </li>
            {categories.map((c) => {
              const href = (() => {
                const p = new URLSearchParams();
                Object.entries(searchParams).forEach(([k, v]) => {
                  if (typeof v === "string") p.set(k, v);
                });
                p.set("cat", String(c.id));
                return "?" + p.toString();
              })();
              const active = c.id === activeCatId;
              return (
                <li key={c.id}>
                  <Link
                    scroll={false}
                    href={href}
                    className={
                      active
                        ? "w-full text-left px-4 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-primary truncate bg-primary text-white shadow"
                        : "w-full text-left px-4 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-primary truncate text-gray-800 hover:bg-primary/10"
                    }
                  >
                    <span className="truncate">{c.name}</span>
                  </Link>
                </li>
              );
            })}
          </>
        )}
      </ul>
    </aside>
  );
}
