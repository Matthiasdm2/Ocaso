import { type NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";
import { withCORS } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: withCORS(req) });
}

export async function GET(request: NextRequest) {
    // Admin guard via cookie-bound client
    const auth = supabaseServer();
    const { data: userRes, error: userErr } = await auth.auth.getUser();
    if (userErr) {
        return NextResponse.json({ error: userErr.message }, { status: 401 });
    }
    const user = userRes?.user;
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await auth
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
    if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, {
            status: 500,
        });
    }
    if (!profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let supabase;
    try {
        supabase = supabaseServiceRole();
    } catch (e) {
        const msg = e instanceof Error
            ? e.message
            : "Failed to init service role";
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

        return NextResponse.json(dailyListings, { headers: withCORS(request) });
    } catch (error) {
        console.error("Error fetching daily listings:", error);
        return NextResponse.json({ error: "Failed to fetch daily listings" }, {
            status: 500,
            headers: withCORS(request),
        });
    }
}
