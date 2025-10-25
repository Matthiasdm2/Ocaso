"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

const MarketplaceMap = dynamic(() => import("@/components/MarketplaceMap"), { ssr: false });

type ListingBasic = {
  id: string;
  title: string;
  price?: number;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
};

interface Props {
  listings: ListingBasic[];
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
}

export default function MarketplaceMapModal({ listings, centerLat, centerLng, radiusKm }: Props) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  // Protect against null/undefined listings
  const safeListings = Array.isArray(listings) ? listings : [];

  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener("ocaso-open-map", handler);
    return () => window.removeEventListener("ocaso-open-map", handler);
  }, [openModal]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    if (open) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, closeModal]);

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[80vh]">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <h2 className="text-sm font-semibold">Zoekertjes op kaart</h2>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-[11px] text-gray-500">Shift + sleep of knop &#39;Selecteer gebied&#39;</span>
                <button onClick={closeModal} className="text-sm px-2 py-1 rounded bg-white border hover:bg-gray-100">Sluiten</button>
              </div>
            </div>
            <div className="flex-1">
              <MarketplaceMap listings={safeListings} centerLat={centerLat} centerLng={centerLng} radiusKm={radiusKm} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
