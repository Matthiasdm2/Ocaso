import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ListingView {
    user_id: string | null;
    session_id: string | null;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "31d";

    // Bereken de startdatum gebaseerd op de periode
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
            days = 365; // Laatste jaar voor "all"
            break;
    }

    try {
        // Haal echte dagelijkse bezoekers data uit listing_views tabel
        const dailyVisitors = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format

            // Tel unieke views voor deze dag (per user_id of session_id)
            const { data: viewsData, error } = await supabase
                .from("listing_views")
                .select("user_id, session_id")
                .gte("created_at", `${dateStr}T00:00:00.000Z`)
                .lt("created_at", `${dateStr}T23:59:59.999Z`);

            if (error) {
                console.error("Error fetching views for date", dateStr, error);
                continue;
            }

            // Tel unieke bezoekers (user_id of session_id)
            const uniqueVisitors = new Set();
            (viewsData as ListingView[])?.forEach((view) => {
                if (view.user_id) {
                    uniqueVisitors.add(`user_${view.user_id}`);
                } else if (view.session_id) {
                    uniqueVisitors.add(`session_${view.session_id}`);
                }
            });

            const visitorCount = uniqueVisitors.size;

            dailyVisitors.push({
                date: dateStr,
                visitors: visitorCount,
                day: date.toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                }),
            });
        }

        return NextResponse.json(dailyVisitors);
    } catch (error) {
        console.error("Error fetching daily visitors:", error);
        return NextResponse.json({ error: "Failed to fetch daily visitors" }, {
            status: 500,
        });
    }
}
