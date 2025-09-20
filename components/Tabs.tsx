"use client";
import { useState } from "react";

export type TabItem = string | { label: string; badge?: number };

function getLabel(t: TabItem) {
  return typeof t === "string" ? t : t.label;
}
function getBadge(t: TabItem) {
  return typeof t === "string" ? undefined : t.badge;
}

export default function Tabs({
  tabs,
  initial = 0,
  onChange,
}: {
  tabs: TabItem[];
  initial?: number;
  onChange?: (i: number) => void;
}) {
  const [active, setActive] = useState(initial);
  return (
    <div className="border-b border-gray-200 mb-4 flex gap-2 overflow-x-auto hidden-scroll">
      {tabs.map((t, i) => {
        const label = getLabel(t);
        const badge = getBadge(t);
        const isActive = i === active;
        return (
          <button
            key={i}
            onClick={() => {
              setActive(i);
              onChange?.(i);
            }}
            className={`px-3 py-2 rounded-t-xl text-sm relative ${isActive ? "bg-white border border-b-white -mb-px" : "text-gray-600 hover:text-gray-900"}`}
          >
            <span>{label}</span>
            {typeof badge === "number" && badge > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-black text-[11px] leading-none">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
