import { type NextRequest, NextResponse } from "next/server";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    let supabase;
    try {
        supabase = supabaseServiceRole();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to init service role";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "31d";

    // Bereken het aantal dagen gebaseerd op periode
    const now = new Date();
    let days: number;

    switch (period) {
        case "7d":
            days = 7;
            break;
        case "31d":
            days = 31;
            break;
        case "1y":
            days = 365;
            break;
        case "all":
        default:
            days = 365; // Voor "all" tonen we laatste jaar
            break;
    }

    try {
        const dailyListings = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format

            // Tel nieuwe listings voor deze dag
            const { count: listingCount } = await supabase
                .from("listings")
                .select("*", { count: "exact", head: true })
                .gte("created_at", `${dateStr}T00:00:00.000Z`)
                .lt("created_at", `${dateStr}T23:59:59.999Z`);

            dailyListings.push({
                date: dateStr,
                listings: listingCount || 0,
                day: date.toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                }),
            });
        }

        return NextResponse.json(dailyListings);
    } catch (error) {
        console.error("Error fetching daily listings:", error);
        return NextResponse.json({ error: "Failed to fetch daily listings" }, {
            status: 500,
        });
    }
}
