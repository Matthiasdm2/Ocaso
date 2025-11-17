import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    // First, get all business profiles
    const { data: businesses, error: fetchError } = await supabaseAdmin()
      .from("profiles")
      .select("id")
      .eq("is_business", true);

    if (fetchError) {
      return NextResponse.json({
        error: `Failed to fetch businesses: ${fetchError.message}`,
      }, { status: 500 });
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({
        message: "No businesses found to initialize",
      });
    }

    // Initialize stats for each business
    const results = [];
    for (const business of businesses) {
      try {
        // Call the recalc function for each business
        const { error: recalcError } = await supabaseAdmin()
          .rpc("recalc_dashboard_stats", { bid: business.id });

        if (recalcError) {
          results.push({
            business_id: business.id,
            error: recalcError.message,
          });
        } else {
          results.push({ business_id: business.id, success: true });
        }
      } catch (err) {
        results.push({ business_id: business.id, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      message:
        `Initialized dashboard stats for ${successCount} businesses, ${errorCount} errors`,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
