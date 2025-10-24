import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const body = await req.json();
    const { name, slug, sort_order, is_active, category_id } = body;

    const admin = supabaseAdmin();
    const { data, error } = await admin
        .from("subcategories")
        .insert({ name, slug, sort_order, is_active, category_id })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
