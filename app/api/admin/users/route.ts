import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const supabase = supabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const subscriptions = url.searchParams.get("subscriptions") === "true";
    const email = url.searchParams.get("email");

    const selectFields = subscriptions
        ? "id, full_name, email, business_plan, subscription_active"
        : "id, full_name, email, account_type, is_admin, phone, bio, address, bank, preferences, notifications, avatar_url";

    let query = supabase
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
}
