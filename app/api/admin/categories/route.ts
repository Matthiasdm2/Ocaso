import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const admin = supabaseAdmin();
        const { data, error } = await admin
            .from("listings")
            .select("id, title, price, seller_id, created_at, stock")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in GET /api/admin/categories:", error);
        return NextResponse.json({ error: "Interne server fout" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const admin = supabaseAdmin();
        const { data, error } = await admin
            .from("listings")
            .insert([body])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in POST /api/admin/categories:", error);
        return NextResponse.json({ error: "Interne server fout" }, { status: 500 });
    }
}
