import { supabaseServer } from "@/lib/supabaseServer";
import type { Listing } from "@/lib/types";

import ListingCard from "../../components/ListingCard";

async function getData(): Promise<{ sponsored: Listing[] }> {
  try {
    const supabase = supabaseServer();
    
    const { data: sponsoredData } = await supabase
      .from("listings")
      .select("id,title,price,location,state,images,main_photo,created_at,status")
      .eq("status", "actief")
      .eq("is_sponsored", true)
      .order("created_at", { ascending: false })
      .limit(12);

    type RawListing = {
      id: number;
      title: string;
      price: number;
      location: string | null;
      state: string | null;
      images: string[] | null;
      main_photo: string | null;
      created_at: string;
    };

    const sponsored = (sponsoredData as RawListing[] | null || []).map((l: RawListing) => ({
      id: String(l.id),
      title: l.title,
      price: l.price,
      location: l.location || "",
      state: (l.state as "new" | "like-new" | "good" | "used") || undefined,
      main_photo: l.main_photo || undefined,
      images: Array.isArray(l.images) ? l.images : [],
      created_at: l.created_at,
    }));

    return { sponsored };
  } catch (error) {
    console.warn("Error fetching sponsored listings:", error);
    return { sponsored: [] };
  }
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
