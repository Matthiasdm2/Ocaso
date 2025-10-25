export const runtime = "nodejs";
// app/api/debug-shops/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = supabaseServer();

  try {
    // Check if shop_views table exists
    const { error: tableError } = await supabase
      .from("shop_views")
      .select("id")
      .limit(1);

    // Check business profiles
    const { data: shops, error: shopsError } = await supabase
      .from("profiles")
      .select("id, shop_name, shop_slug, is_business")
      .eq("is_business", true)
      .not("shop_name", "is", null)
      .not("shop_slug", "is", null)
      .limit(5);

    // Try the trending function
    const { data: trending, error: trendingError } = await supabase.rpc(
      "get_trending_shops_this_week",
    );

    return NextResponse.json({
      tableExists: !tableError,
      tableError: tableError?.message,
      shopsCount: shops?.length || 0,
      shops: shops,
      shopsError: shopsError?.message,
      trendingCount: trending?.length || 0,
      trending: trending,
      trendingError: trendingError?.message,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
