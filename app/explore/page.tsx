"use client";

import { useEffect, useState } from "react";

import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { getBaseUrl } from "@/lib/getBaseUrl";
import type { Listing } from "@/lib/types";

async function getData(): Promise<{ recommended: Listing[] }> {
  const base = getBaseUrl();
  const homeRes = await fetch(`${base}/api/home`, { cache: "no-store" });

  const homeData = await homeRes.json();

  return {
    recommended: homeData.recommended || []
  };
}

export default function ExplorePage() {
  const [recommended, setRecommended] = useState<Listing[]>([]);
  useEffect(() => {
    getData().then(({ recommended }) => {
      setRecommended(recommended);
    });
  }, []);
  const filteredRecommended = recommended;

  return (
    <div className="container py-8 space-y-8">
      <HeroSearch />
      <h1 className="text-xl font-semibold">Ontdekken</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">Aanbevolen voor jou</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredRecommended.slice(0, 12).map((x: Listing) => (
            <ListingCard key={x.id} listing={x} />
          ))}
        </div>
      </section>
    </div>
  );
}
