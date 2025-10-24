import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
    const body = await req.json();
    const { name, slug, sort_order, is_active } = body;

    const { error } = await supabaseAdmin()
        .from("subcategories")
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
    const { error } = await supabaseAdmin()
        .from("subcategories")
        .delete()
        .eq("id", params.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
