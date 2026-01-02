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
        // Voor subscriptions: selecteer zowel business_plan als business JSONB voor accurate status
        const selectFields = subscriptions
            ? "id, full_name, email, business_plan, business"
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
        
        // Debug logging
        if (subscriptions && data) {
            console.log("Admin users query result:", data.length, "users");
            const testUser = data.find((u: any) => u.id === "ceff7855-beed-4d1e-9b93-83cfca0ad3e0");
            if (testUser) {
                console.log("Test user business_plan:", testUser.business_plan);
            }
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Als subscriptions mode, voeg subscription_active toe gebaseerd op business JSONB of business_plan
        if (subscriptions && data) {
            const enrichedData = data.map((user: any) => {
                // Check eerst business JSONB voor subscription_active
                const businessActive = user.business?.subscription_active;
                const hasBusinessPlan = !!(user.business_plan && user.business_plan.trim() !== '');
                
                // Als subscription_active expliciet is gezet in business JSONB, gebruik die
                // Anders, als plan en billing_cycle bestaan, beschouw als actief
                // Fallback: gebruik business_plan check
                let subscriptionActive = false;
                if (typeof businessActive === 'boolean') {
                    subscriptionActive = businessActive;
                } else if (user.business?.plan && user.business?.billing_cycle) {
                    subscriptionActive = true; // Plan en billing bestaan = actief
                } else {
                    subscriptionActive = hasBusinessPlan; // Fallback naar business_plan check
                }
                
                return {
                    ...user,
                    subscription_active: subscriptionActive,
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
