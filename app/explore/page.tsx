"use client";
import { useEffect, useState } from "react";

import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

function getData(): Promise<{ sponsored: Listing[]; recommended: Listing[] }> {
  return fetch("/api/home", { cache: "no-store" }).then((res) => res.json());
}

export default function ExplorePage() {
  const [sponsored, setSponsored] = useState<Listing[]>([]);
  const [recommended, setRecommended] = useState<Listing[]>([]);
  const [showBusiness, setShowBusiness] = useState(true);
  useEffect(() => {
    getData().then(({ sponsored, recommended }) => {
      setSponsored(sponsored);
      setRecommended(recommended);
    });
  }, []);
  const filteredSponsored = sponsored.filter((x: Listing) => showBusiness || !x.isBusinessSeller);
  const filteredRecommended = recommended.filter((x: Listing) => showBusiness || !x.isBusinessSeller);

  return (
    <div className="container py-8 space-y-8">
      <HeroSearch />
      <h1 className="text-xl font-semibold">Ontdekken</h1>

      <div className="mb-6 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showBusiness}
            onChange={e => setShowBusiness(e.target.checked)}
            className="rounded border-gray-300"
          />
          Toon zakelijke artikelen
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Populair</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredSponsored.map((x: Listing) => (
            <ListingCard key={x.id} listing={x} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Trending</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredRecommended.slice(0, 12).map((x: Listing) => (
            <ListingCard key={x.id} listing={x} />
          ))}
        </div>
      </section>
    </div>
  );
}
