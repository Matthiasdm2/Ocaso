import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/seed
// Admin-only. Seeds a handful of listings so the admin portal shows live data.
export async function POST() {
  const admin = supabaseAdmin();

  // Pick a few categories/subcategories if available, otherwise leave nulls
  type Cat = {
    id: number;
    name: string;
    subcategories: { id: number; name: string }[];
  };
  const { data: cats, error: catErr } = await admin
    .from("categories")
    .select("id,name, subcategories(id,name)")
    .limit(3);
  if (catErr) {
    // Not fatal; continue with null categories
    // eslint-disable-next-line no-console
    console.warn("[seed] Failed to load categories:", catErr.message);
  }

  const choose = <T>(
    arr: T[] | null | undefined,
    i: number,
  ): T | undefined => (arr && arr.length ? arr[i % arr.length] : undefined);

  // Build simple demo listings
  const samples = [
    {
      title: "Demo fiets",
      description: "Degelijke stadsfiets in goede staat.",
      price: 120.0,
      state: "good",
      location: "Antwerpen",
      images: ["https://picsum.photos/seed/ocaso-bike/640/480"],
    },
    {
      title: "iPhone 12 128GB",
      description: "Zo goed als nieuw, altijd met hoesje gebruikt.",
      price: 380.0,
      state: "like_new",
      location: "Gent",
      images: ["https://picsum.photos/seed/ocaso-phone/640/480"],
    },
    {
      title: "Boekenpakket romans",
      description: "Pakket van 10 recente romans.",
      price: 25.0,
      state: "fair",
      location: "Leuven",
      images: ["https://picsum.photos/seed/ocaso-books/640/480"],
    },
  ].map((s, idx) => {
    const cat = choose<Cat>(cats ?? undefined, idx);
    const sub = choose<Cat["subcategories"][number]>(cat?.subcategories, 0);
    return {
      ...s,
      status: "actief",
      seller_id: user.id,
      created_by: user.id,
      categories: cat ? [String(cat.id), ...(sub ? [String(sub.id)] : [])] : [],
      category_id: cat?.id ?? null,
      subcategory_id: sub?.id ?? null,
      allowoffers: true,
      allow_shipping: true,
      shipping_length: null,
      shipping_width: null,
      shipping_height: null,
      shipping_weight: null,
      min_bid: null,
      secure_pay: false,
      promo_featured: false,
      promo_top: false,
      stock: 1,
    };
  });

  const { data: inserted, error: insErr } = await admin
    .from("listings")
    .insert(samples)
    .select("id,title,price,status,category_id,subcategory_id");
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    insertedCount: inserted?.length ?? 0,
    ids: inserted?.map((r) => r.id) ?? [],
  });
}
