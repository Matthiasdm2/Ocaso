export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { toURL } from "@/lib/url";

interface Listing {
  id: string;
  title?: string;
  price?: number | string;
  images?: string[];
  created_at: string;
  status?: string;
  views?: number | string;
  messages?: number | string;
  favorites?: number | string;
  seller_id: string;
}

export async function GET(req: Request) {
  const url = toURL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? 20)),
  );
  const offset = (page - 1) * limit;
  const supabase = supabaseServer();

  // 1) Probeer ingelogde user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2) Fallback: laat client seller_id meesturen
  const fallbackSellerId = url.searchParams.get("seller_id") || undefined;
  const sellerId = user?.id ?? fallbackSellerId;
  if (!sellerId) {
    return NextResponse.json({ error: "Geen gebruiker" }, { status: 401 });
  }

  // Fetch listings from Supabase
  const { data, error, count } = await supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data ?? []).map((l: Listing) => ({
    id: l.id,
    title: l.title ?? "",
    price: Number(l.price ?? 0),
    thumb: Array.isArray(l.images) && l.images[0] ? l.images[0] : null,
    createdAt: l.created_at,
    status: l.status ?? "actief",
    views: Number(l.views ?? 0),
    messages: Number(l.messages ?? 0),
    favorites: Number(l.favorites ?? 0),
    seller_id: l.seller_id,
  }));

  return NextResponse.json(
    { items, page, limit, total: count ?? items.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
