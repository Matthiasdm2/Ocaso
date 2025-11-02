export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

function supabaseFromBearer(token?: string | null) {
    if (!token) return null;
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        return createClient(url, anon, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });
    } catch {
        return null;
    }
}

export async function POST(
    req: Request,
    { params }: { params: { slug: string[] } },
) {
    let supabase = supabaseServer();
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        const auth = req.headers.get("authorization");
        const token = auth?.toLowerCase().startsWith("bearer ")
            ? auth.slice(7)
            : null;
        const alt = supabaseFromBearer(token);
        if (alt) {
            const got = await alt.auth.getUser();
            if (got.data.user) {
                user = got.data.user;
                supabase = alt;
            }
        }
    }
    if (!user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("conversation_reads").upsert({
        conversation_id: params.slug[0],
        user_id: user.id,
        last_read_at: new Date().toISOString(),
    });
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}
