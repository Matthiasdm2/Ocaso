"use client";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CATEGORIES } from "@/lib/categories";

type Props = {
  mode: "home" | "categories"; // home: clicking main cat navigates; categories: clicking expands
  defaultOpenSlug?: string | null;
};

export default function MainCategoryList({
  mode,
  defaultOpenSlug = null,
}: Props) {
  const [open, setOpen] = useState<string | null>(defaultOpenSlug || null);
  const router = useRouter();

  useEffect(() => {
    // Sync if defaultOpenSlug changes (e.g., from route param)
    setOpen(defaultOpenSlug || null);
  }, [defaultOpenSlug]);

  return (
    <div className="card divide-y">
      {CATEGORIES.map((cat) => {
        const isOpen = open === cat.slug;
        return (
          <div key={cat.slug} className="p-4">
            <button
              onClick={() => {
                if (mode === "home") {
                  router.push(`/categories/${cat.slug}`);
                  return;
                }
                setOpen(isOpen ? null : cat.slug);
              }}
              className="w-full flex items-center justify-between text-left"
              aria-expanded={isOpen}
              aria-controls={`subs-${cat.slug}`}
            >
              <div className="font-medium">{cat.name}</div>
              <ChevronDown
                className={`size-4 transition ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {mode === "categories" && isOpen && (
              <div id={`subs-${cat.slug}`} className="mt-3 space-y-1">
                {cat.subs.map((sub) => (
                  <div key={sub.slug}>
                    <a
                      href={`/search?cat=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub.name)}`}
                      className="text-sm text-gray-700 hover:underline block"
                    >
                      {sub.name}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
