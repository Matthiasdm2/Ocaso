import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
    try {
        const sb = supabaseAdmin();
        const { data, error } = await sb
            .from("listings")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json({ ok: true, listings: data ?? [] });
    } catch (err) {
        return NextResponse.json({ ok: false, error: (err as Error)?.message ?? String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const sb = supabaseAdmin();
        const { data, error } = await sb.from("listings").insert(body).select().single();
        if (error) throw error;
        return NextResponse.json({ ok: true, listing: data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ ok: false, error: (err as Error)?.message ?? String(err) }, { status: 500 });
    }
}
