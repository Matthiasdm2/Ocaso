"use client";

import { useState } from "react";

const TABS = ["Alles", "Elektronica", "Meubels", "Kleding", "Sport"];

export default function FilterTabs() {
  const [active, setActive] = useState("Alles");

  return (
    <div className="flex gap-2 overflow-x-auto hidden-scroll">
      {TABS.map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-3 py-1 rounded-full text-sm transition
              ${isActive ? "bg-primary text-black" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
