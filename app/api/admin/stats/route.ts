import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { toURL } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = toURL(request.url);
    const period = searchParams.get("period") || "31d";

    // Bereken de startdatum gebaseerd op de periode
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "31d":
            startDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
            break;
        case "1y":
            startDate = new Date(
                now.getFullYear() - 1,
                now.getMonth(),
                now.getDate(),
            );
            break;
        case "all":
        default:
            startDate = new Date(0); // Vanaf het begin
            break;
    }

    try {
        // Bezoekers: tel unieke bezoekers die listings hebben bekeken in de periode
        const { data: viewsData, error: viewsError } = await supabase
            .from("listing_views")
            .select("user_id, session_id")
            .gte("created_at", startDate.toISOString());

        let visitorsCount = 0;
        if (!viewsError && viewsData) {
            const uniqueVisitors = new Set();
            viewsData.forEach((view) => {
                if (view.user_id) {
                    uniqueVisitors.add(`user_${view.user_id}`);
                } else if (view.session_id) {
                    uniqueVisitors.add(`session_${view.session_id}`);
                }
            });
            visitorsCount = uniqueVisitors.size;
        }

        // Listings: tel alle listings
        const { count: listingsCount } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true });

        // Sales: tel listings met status 'sold' in de periode
        const { count: salesCount } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .eq("status", "sold")
            .gte("created_at", startDate.toISOString());

        // Shipments: voor nu 0, omdat er geen shipped status is
        // Misschien later toevoegen als er een verzendproces is
        const shipmentsCount = 0;

        return NextResponse.json({
            visitors: visitorsCount || 0,
            listings: listingsCount || 0,
            sales: salesCount || 0,
            shipments: shipmentsCount || 0,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, {
            status: 500,
        });
    }
}
