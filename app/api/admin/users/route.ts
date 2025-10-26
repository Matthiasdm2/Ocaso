import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // TEMP: Admin authenticatie uitgeschakeld voor debugging
        // const authResult = await requireAdmin();
        // if (authResult instanceof NextResponse) {
        //     return authResult; // Error response
        // }

        const url = new URL(req.url);
        const subscriptions = url.searchParams.get("subscriptions") === "true";
        const email = url.searchParams.get("email");

        const selectFields = subscriptions
            ? "id, full_name, email, business_plan, subscription_active"
            : "id, full_name, email, account_type, is_admin, phone, bio, address, bank, preferences, notifications, avatar_url";

        const adminClient = supabaseAdmin();

        let query = adminClient
            .from("profiles")
            .select(selectFields);

        if (email) {
            query = query.eq("email", email);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Admin users error:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
