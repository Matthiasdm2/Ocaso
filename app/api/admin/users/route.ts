import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // TEMP: Admin authenticatie uitgeschakeld voor debugging
        // const authResult = await requireAdmin();
        // if (authResult instanceof NextResponse) {
        //     return authResult; // Error response
        // }

        const url = new URL(req.url);
        const subscriptions = url.searchParams.get("subscriptions") === "true";
        const email = url.searchParams.get("email");

        // Selecteer alleen velden die gegarandeerd bestaan in de database
        // Voor subscriptions: selecteer business_plan voor accurate status
        const selectFields = subscriptions
            ? "id, full_name, email, business_plan"
            : "id, full_name, display_name, email, account_type, is_admin, is_business, avatar_url, created_at, updated_at";

        const adminClient = supabaseAdmin();

        let query = adminClient
            .from("profiles")
            .select(selectFields)
            .order("created_at", { ascending: false }); // Voeg ordering toe om caching te vermijden

        if (email) {
            query = query.eq("email", email);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        
        if (!data) {
            return NextResponse.json({ error: "No data returned" }, { status: 400 });
        }
        
        interface UserRow {
            id: string;
            full_name?: string | null;
            display_name?: string | null;
            email?: string | null;
            business_plan?: string | null;
            account_type?: string | null;
            is_admin?: boolean | null;
            is_business?: boolean | null;
            avatar_url?: string | null;
            created_at?: string | null;
            updated_at?: string | null;
        }

        // Debug logging
        if (subscriptions) {
            console.log("Admin users query result:", data.length, "users");
            const testUser = (data as unknown as UserRow[]).find((u) => u.id === "ceff7855-beed-4d1e-9b93-83cfca0ad3e0");
            if (testUser) {
                console.log("Test user business_plan:", testUser.business_plan);
            }
        }

        // Als subscriptions mode, voeg subscription_active toe gebaseerd op business_plan
        if (subscriptions && data) {
            const enrichedData = (data as unknown as UserRow[]).map((user) => {
                const hasBusinessPlan = !!(user.business_plan && String(user.business_plan).trim() !== '');
                
                return {
                    ...user,
                    subscription_active: hasBusinessPlan,
                };
            });
            return NextResponse.json(enrichedData);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Admin users error:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
