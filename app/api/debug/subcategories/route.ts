import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function GET() {
  // Disable this debug endpoint in production to avoid build/export issues
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not available in production" }, {
      status: 404,
    });
  }

  try {
    const supabase = supabaseServiceRole();

    // Get all subcategories
    const { data: allSubs, error: allError } = await supabase
      .from("subcategories")
      .select("*")
      .limit(50);

    // Get all categories
    const { data: allCats, error: catError } = await supabase
      .from("categories")
      .select("*")
      .limit(50);

    // Check listings with categories
    const { data: listings, error: listError } = await supabase
      .from("listings")
      .select("id, categories")
      .not("categories", "is", null)
      .limit(10);

    return NextResponse.json({
      subcategories: allSubs,
      categories: allCats,
      listings_with_categories: listings,
      errors: {
        subcategories: allError?.message,
        categories: catError?.message,
        listings: listError?.message,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
