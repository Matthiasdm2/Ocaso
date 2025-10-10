import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
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

    const { data, error } = await supabase
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

    const body = await req.json();
    const { name, slug, sort_order, is_active } = body;

    const { data, error } = await supabase
        .from("categories")
        .insert({ name, slug, sort_order, is_active })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
