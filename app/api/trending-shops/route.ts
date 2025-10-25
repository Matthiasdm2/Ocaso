export const runtime = "nodejs";
// app/api/trending-shops/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseServer();

  try {
    // Get trending shops using the database function
    const { data, error } = await supabase.rpc("get_trending_shops_this_week");

    if (error) {
      console.error("Error fetching trending shops:", error);
      // Return empty array instead of error for now
      return NextResponse.json({ shops: [] }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Transform the data to match the expected format
    type ShopData = {
      profile_id: string;
      shop_slug: string;
      shop_name: string;
      view_count: number;
    };

    const shops = (data as ShopData[] || []).map((shop: ShopData) => ({
      id: shop.profile_id,
      shop_slug: shop.shop_slug,
      shop_name: shop.shop_name,
      view_count: shop.view_count,
    }));

    return NextResponse.json({ shops }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unexpected error in trending shops API:", error);
    // Return empty array instead of error
    return NextResponse.json({ shops: [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
