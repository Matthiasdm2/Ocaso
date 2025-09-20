"use client";

import { useEffect, useState } from "react";

type CollapsibleContainerProps = {
  title?: string;
  defaultOpenDesktop?: boolean;   // standaard open op ≥ lg
  defaultOpenMobile?: boolean;    // standaard open op < lg
  className?: string;
  elevation?: "default" | "flat"; // flat = geen shadow en lage z-index
  children: React.ReactNode;
};

export default function CollapsibleContainer({
  title = "Filters",
  defaultOpenDesktop = true,
  defaultOpenMobile = false,
  className = "",
  elevation = "default",
  children,
}: CollapsibleContainerProps) {
  const [open, setOpen] = useState<boolean>(defaultOpenDesktop);

  // Zet default state op basis van viewport (desktop vs mobile)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches; // Tailwind lg
    setOpen(isDesktop ? defaultOpenDesktop : defaultOpenMobile);
  }, [defaultOpenDesktop, defaultOpenMobile]);

  return (
    <div
      className={[
        // Altijd witte kaart, ook in dark mode
  "rounded-2xl border border-gray-200 bg-white",
  elevation === "default" ? "shadow-sm z-10" : "shadow-none z-0",
        "text-gray-900", // consistente tekstkleur
        className,
      ].join(" ")}
    >
      {/* Header */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-4"
      >
        <span className="text-sm lg:text-base font-semibold">{title}</span>
        {/* Gebruik w/h i.p.v. size-* voor maximale compatibiliteit */}
        <ChevronIcon className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Content met smooth collapse */}
      <div
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 lg:px-5 lg:pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
