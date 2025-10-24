import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = supabaseAdmin();
        // Tel alle listings
        const { count: listingsCount } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true });

        // Tel alle biedingen
        const { count: bidsCount } = await supabase
            .from("bids")
            .select("*", { count: "exact", head: true });

        // Tel alle favorieten
        const { count: favoritesCount } = await supabase
            .from("favorites")
            .select("*", { count: "exact", head: true });

        return NextResponse.json({
            listings: listingsCount || 0,
            bids: bidsCount || 0,
            favorites: favoritesCount || 0,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, {
            status: 500,
        });
    }
}
