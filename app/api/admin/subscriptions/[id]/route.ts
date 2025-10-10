import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
    const supabase = supabaseServer();
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
    const { business_plan } = body;

    const subscription_active = business_plan ? true : false;

    const { error } = await supabase
        .from("profiles")
        .update({ business_plan, subscription_active })
        .eq("id", params.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
