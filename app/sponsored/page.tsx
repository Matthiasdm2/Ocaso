import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

async function getData(): Promise<{ sponsored: Listing[] }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/home`,
    { cache: "no-store" },
  );
  const data = await res.json();
  return { sponsored: data.sponsored };
}

export default async function SponsoredPage() {
  const { sponsored } = await getData();
  return (
    <div className="container py-8 space-y-4">
      <h1 className="text-xl font-semibold">Gesponsorde zoekertjes</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sponsored.map((x) => (
          <ListingCard key={x.id} item={x} />
        ))}
      </div>
    </div>
  );
}
