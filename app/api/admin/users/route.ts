import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    // Use cookie-bound anon client to authenticate requester
    const authClient = supabaseServer();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
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

    // Use service role client for unrestricted admin query (bypasses RLS)
    let adminClient;
    try {
        adminClient = supabaseServiceRole();
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Service role client init failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }

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
}
