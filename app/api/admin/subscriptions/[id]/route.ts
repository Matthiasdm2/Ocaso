import { NextResponse } from "next/server";

import { parseBusinessPlan } from "@/lib/subscription-helpers";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
    try {
        const body = await req.json();
        const { business_plan } = body;

        console.log("Updating subscription:", { id: params.id, business_plan });

        const admin = supabaseAdmin();
        
        // Parse business_plan naar plan en billing voor business JSONB
        const parsed = parseBusinessPlan(business_plan);
        
        // Bereid update data voor
        const updateData: Record<string, unknown> = {
            business_plan: business_plan || null,
        };
        
        // Update business JSONB kolom - exact dezelfde structuur als webhook
        if (parsed) {
            // Abonnement toevoegen/updaten - exact dezelfde output als webhook
            updateData.business = {
                plan: parsed.plan,
                billing_cycle: parsed.billing,
                subscription_active: true,
                subscription_updated_at: new Date().toISOString(),
            };
        } else if (!business_plan || business_plan.trim() === '') {
            // Als business_plan wordt verwijderd, zet subscription_active op false
            // Behoud plan en billing_cycle voor historie (zoals webhook zou doen)
            updateData.business = {
                subscription_active: false,
                subscription_updated_at: new Date().toISOString(),
            };
        }

        console.log("Updating subscription data:", { id: params.id, updateData });

        const { data: updateResult, error: updateError } = await admin
            .from("profiles")
            .update(updateData)
            .eq("id", params.id)
            .select("id, business_plan")
            .single();

        if (updateError) {
            console.error("Error updating business_plan:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // Check if update was successful
        if (!updateResult) {
            return NextResponse.json({ 
                error: "Failed to update subscription" 
            }, { status: 400 });
        }
        
        const data = updateResult;

        console.log("Update successful:", data);
        
        // Verifieer dat de update correct is door de data opnieuw op te halen
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: verifyData, error: verifyError } = await admin
            .from("profiles")
            .select("id, business_plan")
            .eq("id", params.id)
            .single();
        
        if (verifyError || !verifyData) {
            console.error("Error verifying update:", verifyError);
        } else {
            console.log("Verified update:", { 
                business_plan: verifyData.business_plan,
            });
        }
        
        // Return success met duidelijke data
        const finalBusinessPlan = verifyData?.business_plan || updateResult?.business_plan || business_plan;
        const finalSubscriptionActive = !!(finalBusinessPlan && finalBusinessPlan.trim() !== '');
        
        const responseData = {
          success: true,
          data: {
            id: params.id,
            business_plan: finalBusinessPlan,
            subscription_active: finalSubscriptionActive,
          },
        };
        
        console.log('✅ Final response:', responseData);
        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Internal server error" 
        }, { status: 500 });
    }
}
