import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
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
    const { error } = await admin
        .from("categories")
        .update({ name, slug, sort_order, is_active })
        .eq("id", params.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } },
) {
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

    let admin;
    try {
        admin = supabaseServiceRole();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Service role init failed";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
    const { error } = await admin
        .from("categories")
        .delete()
        .eq("id", params.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
