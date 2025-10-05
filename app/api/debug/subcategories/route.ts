import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function GET() {
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
      listings: listError?.message
    }
  });
}
