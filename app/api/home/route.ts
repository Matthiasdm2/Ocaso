export const runtime = "nodejs";
// app/api/home/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);
  const cursor = Math.max(0, Number(searchParams.get("cursor") || "0"));
  const pageSize = 24;

  console.log(`[HOME API] Fetching home data, cursor=${cursor}`);

  // Sponsored (optioneel, fallback: leeg)
  type Listing = {
    id: string;
    title: string;
    price: number;
    location?: string;
    state?: string;
    main_photo: string | null;
    images: string[];
    created_at: string | null;
    sponsored: boolean;
  };

  let sponsored: Listing[] = [];
  const { data: sponsoredData } = await supabase
    .from("listings")
    .select("id,title,price,location,state,images,created_at,status")
    .eq("status", "actief")
    .eq("is_sponsored", true) // <-- maak deze kolom aan als je hem nog niet hebt
    .order("created_at", { ascending: false })
    .limit(12);

  console.log(`[HOME API] Sponsored query result: ${sponsoredData?.length || 0} items`);

  type ImageField = string[] | null | undefined;
  interface RawListing {
    id: string;
    title: string;
    price: number;
    location?: string | null;
    state?: string | null;
    images?: ImageField;
    main_photo?: string | null;
    created_at: string | null;
    status?: string;
  }
  sponsored = ((sponsoredData as unknown) as RawListing[] | null | undefined ?? []).map((
    l: RawListing,
  ) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    location: l.location ?? undefined,
    state: l.state ?? undefined,
    main_photo: (Array.isArray(l.images) && l.images.length ? l.images[0] : null),
    images: Array.isArray(l.images) ? l.images : [],
    created_at: l.created_at ?? '',
    sponsored: true,
  }));

  // Recommended = recente listings in batches van 24
  const from = cursor * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("listings")
    .select("id,title,price,location,state,images,created_at,status")
    .eq("status", "actief")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error(`[HOME API] Error fetching recommended: ${error.message}`);
    return NextResponse.json({
      sponsored: [],
      recommended: [],
      error: error.message,
    }, { status: 400 });
  }

  console.log(`[HOME API] Recommended query result: ${data?.length || 0} items`);

  const recommended = ((data as unknown) as RawListing[] | null | undefined ?? []).map((
    l: RawListing,
  ) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    location: l.location ?? undefined,
    state: l.state ?? undefined,
    main_photo: (Array.isArray(l.images) && l.images.length ? l.images[0] : null),
    images: Array.isArray(l.images) ? l.images : [],
    created_at: l.created_at ?? '',
    sponsored: false,
  }));

  console.log(`[HOME API] Returning ${sponsored.length} sponsored, ${recommended.length} recommended`);

  return NextResponse.json({ sponsored, recommended }, {
    headers: { "Cache-Control": "no-store" },
  });
}
