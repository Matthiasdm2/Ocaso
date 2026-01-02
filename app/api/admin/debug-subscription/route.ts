import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug endpoint om te controleren of business_plan daadwerkelijk wordt opgeslagen
 * GET /api/admin/debug-subscription?id={user_id}
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get("id");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const admin = supabaseAdmin();

        // Haal alle relevante velden op (zonder business kolom als deze niet bestaat)
        const { data, error } = await admin
            .from("profiles")
            .select("id, email, full_name, business_plan, updated_at")
            .eq("id", userId)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: data.id,
                email: data.email,
                full_name: data.full_name,
                business_plan: data.business_plan,
                updated_at: data.updated_at,
            },
        });
    } catch (error) {
        console.error("Debug subscription error:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Internal server error" 
        }, { status: 500 });
    }
}

