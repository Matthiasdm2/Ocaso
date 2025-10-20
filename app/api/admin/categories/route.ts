import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    // Authenticate requester using cookie-bound anon client
    const auth = supabaseServer();
    const { data: { user } } = await auth.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await auth
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role for unrestricted admin data access
    let admin;
    try {
        admin = supabaseServiceRole();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Service role init failed";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data, error } = await admin
        .from("categories")
        .select(`
      id, name, slug, sort_order, is_active,
      subs: subcategories(id, name, slug, sort_order, is_active, category_id)
    `)
        .order("sort_order");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const auth = supabaseServer();
    const { data: { user } } = await auth.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await auth
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, sort_order, is_active } = body;

    let admin;
    try {
        admin = supabaseServiceRole();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Service role init failed";
        return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data, error } = await admin
        .from("categories")
        .insert({ name, slug, sort_order, is_active })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
