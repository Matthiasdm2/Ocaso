import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        // TEMP: Admin authenticatie uitgeschakeld voor debugging
        // const authResult = await requireAdmin();
        // if (authResult instanceof NextResponse) {
        //     return authResult; // Error response
        // }

        const url = new URL(request.url);
        const period = url.searchParams.get("period") || "31d";

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

        const supabase = supabaseAdmin();

        // Tel listings in de periode
        const { count: listingsCount } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startDate.toISOString());

        // Tel unieke bezoekers uit listing_views (in de periode)
        const { data: viewsData } = await supabase
            .from("listing_views")
            .select("user_id, session_id")
            .gte("created_at", startDate.toISOString());

        const uniqueVisitors = new Set<string>();
        viewsData?.forEach((view) => {
            if (view.user_id) {
                uniqueVisitors.add(`user_${view.user_id}`);
            } else if (view.session_id) {
                uniqueVisitors.add(`session_${view.session_id}`);
            }
        });

        // Tel verkochte items (listings met status "verkocht" of "sold")
        const { count: salesCount } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .in("status", ["verkocht", "sold"])
            .gte("created_at", startDate.toISOString());

        // Verzendingen: voorlopig 0 (nog niet geïmplementeerd)
        const shipmentsCount = 0;

        return NextResponse.json({
            visitors: uniqueVisitors.size,
            listings: listingsCount || 0,
            sales: salesCount || 0,
            shipments: shipmentsCount,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, {
            status: 500,
        });
    }
}
