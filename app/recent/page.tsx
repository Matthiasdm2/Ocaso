import ListingCard from "../../components/ListingCard";
import { getBaseUrl } from "@/lib/getBaseUrl";
import type { Listing } from "@/lib/types";

async function getData(): Promise<{ items: Listing[] }> {
  const base = getBaseUrl();
  const res = await fetch(
    `${base}/api/listings?page=1&limit=24&sort=date_desc`,
    { cache: "no-store" },
  );
  if (!res.ok) return { items: [] };
  const data = await res.json();
  return { items: data.items ?? [] };
}

export default async function RecentPage() {
  const { items } = await getData();
  return (
    <div className="container py-8 space-y-4">
      <h1 className="text-xl font-semibold">Recent toegevoegd</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((x) => (
          <ListingCard key={x.id} item={x} />
        ))}
      </div>
    </div>
  );
}
