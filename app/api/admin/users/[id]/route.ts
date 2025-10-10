import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

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
    const { is_admin, password, ...profileUpdates } = body;

    // Update profile
    const profileUpdate: Record<string, unknown> = { ...profileUpdates };
    if (is_admin !== undefined) profileUpdate.is_admin = is_admin;

    if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("id", params.id);

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, {
                status: 400,
            });
        }
    }

    // Update password if provided
    if (password) {
        const service = supabaseServiceRole();
        const { error: authError } = await service.auth.admin.updateUserById(
            params.id,
            {
                password,
            },
        );
        if (authError) {
            return NextResponse.json({ error: authError.message }, {
                status: 400,
            });
        }
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    _req: Request,
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

    // Delete profile
    const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", params.id);

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, {
            status: 400,
        });
    }

    // Optionally delete auth user, but requires service role
    // For now, just delete profile

    return NextResponse.json({ success: true });
}
