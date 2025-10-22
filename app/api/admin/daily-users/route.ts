import { type NextRequest, NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";
import { withCORS } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: withCORS(req) });
}

export async function GET(request: NextRequest) {
    // TEMP DEBUG: Test basic database connection
    try {
        const supabase = supabaseServiceRole();
        const { count, error } = await supabase
            .from("profiles")
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
            totalProfiles: count,
            message: "Database connection works"
        }, { headers: withCORS(request) });
    } catch (e) {
        return NextResponse.json({ 
            error: "Service role init failed", 
            details: e instanceof Error ? e.message : String(e)
        }, { status: 500, headers: withCORS(request) });
    }
}
