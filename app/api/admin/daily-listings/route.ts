import { type NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";
import { withCORS } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: withCORS(req) });
}

export async function GET(request: NextRequest) {
    // TEMP DEBUG: Test auth and database connection
    try {
        // Test auth first
        const auth = supabaseServer();
        const { data: userRes, error: userErr } = await auth.auth.getUser();
        if (userErr) {
            return NextResponse.json({ error: "Auth error: " + userErr.message }, { status: 401, headers: withCORS(request) });
        }
        const user = userRes?.user;
        if (!user) {
            return NextResponse.json({ error: "No user" }, { status: 401, headers: withCORS(request) });
        }

        // Test admin check
        const { data: profile, error: profileErr } = await auth
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();
        if (profileErr) {
            return NextResponse.json({ error: "Profile error: " + profileErr.message }, { status: 500, headers: withCORS(request) });
        }
        if (!profile?.is_admin) {
            return NextResponse.json({ error: "Not admin" }, { status: 403, headers: withCORS(request) });
        }

        // Test service role
        const supabase = supabaseServiceRole();
        const { count, error } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .limit(1);

        if (error) {
            return NextResponse.json({ 
                error: "Database query failed", 
                details: error.message,
                code: error.code 
            }, { status: 500, headers: withCORS(request) });
        }

        return NextResponse.json({ 
            success: true, 
            user: user.id,
            isAdmin: profile.is_admin,
            totalListings: count,
            message: "All checks passed"
        }, { headers: withCORS(request) });
    } catch (e) {
        return NextResponse.json({ 
            error: "Unexpected error", 
            details: e instanceof Error ? e.message : String(e)
        }, { status: 500, headers: withCORS(request) });
    }
}
