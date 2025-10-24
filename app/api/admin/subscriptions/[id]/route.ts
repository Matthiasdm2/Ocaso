import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
    const body = await req.json();
    const { business_plan } = body;

    const subscription_active = business_plan ? true : false;

    const { error } = await supabaseAdmin()
        .from("profiles")
        .update({ business_plan, subscription_active })
        .eq("id", params.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
