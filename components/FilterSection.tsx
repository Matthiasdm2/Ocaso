"use client";

import { useState } from "react";

type FilterSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function FilterSection({
  title,
  defaultOpen = true,
  children,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0 border-neutral-200/60 dark:border-neutral-800/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-3"
        aria-expanded={open}
      >
        <span className="text-sm font-medium">{title}</span>
        <svg
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden pb-3">
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
