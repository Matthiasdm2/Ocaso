import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { parseBusinessPlan, formatBusinessPlan } from "@/lib/subscription-helpers";

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
        
        // Haal eerst bestaande business JSONB op om te mergen
        const { data: currentProfile } = await admin
            .from("profiles")
            .select("business")
            .eq("id", params.id)
            .maybeSingle();
        
        const existingBusiness = (currentProfile?.business as Record<string, unknown>) || {};
        
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
                ...existingBusiness, // Behoud bestaande velden
                subscription_active: false,
                subscription_updated_at: new Date().toISOString(),
            };
        }

        console.log("Updating subscription data:", { id: params.id, updateData });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updateResult, error: updateError } = await (admin as any)
            .from("profiles")
            .update(updateData)
            .eq("id", params.id)
            .select("id, business_plan")
            .single();

        if (updateError) {
            console.error("Error updating business_plan:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        const { data, error: finalError } = { data: updateResult, error: null };

        if (finalError) {
            console.error("Error updating subscription:", finalError);
            return NextResponse.json({ error: finalError.message }, { status: 400 });
        }

        console.log("Update successful:", data);
        
        // Verifieer dat de update correct is door de data opnieuw op te halen
        // Wacht even om zeker te zijn dat de database write compleet is
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: verifyData, error: verifyError } = await admin
            .from("profiles")
            .select("id, business_plan, business")
            .eq("id", params.id)
            .single();
        
        if (verifyError) {
            console.error("Error verifying update:", verifyError);
        } else {
            console.log("Verified update:", { 
                business_plan: verifyData.business_plan,
                business: verifyData.business,
            });
            
            // Verifieer dat business JSONB ook correct is geüpdatet
            const verifiedBusiness = verifyData.business as Record<string, unknown> | null;
            const expectedActive = !!business_plan;
            const actualActive = verifiedBusiness?.subscription_active;
            
            if (typeof actualActive === 'boolean' && actualActive !== expectedActive) {
                console.warn("Business subscription_active mismatch, fixing...");
                const fixBusiness = {
                    ...verifiedBusiness,
                    subscription_active: expectedActive,
                    subscription_updated_at: new Date().toISOString(),
                };
                await (admin as any)
                    .from("profiles")
                    .update({ business: fixBusiness })
                    .eq("id", params.id);
            }
            
            // Als de verificatie null teruggeeft terwijl we een plan verwachten, probeer nog een keer
            if (verifyData.business_plan !== business_plan && business_plan) {
                console.warn("Verification failed, retrying update...");
                const { error: retryError } = await (admin as any)
                    .from("profiles")
                    .update(updateData)
                    .eq("id", params.id);
                
                if (retryError) {
                    console.error("Retry update error:", retryError);
                } else {
                    // Verifieer opnieuw na retry
                    const { data: retryVerifyData } = await admin
                        .from("profiles")
                        .select("id, business_plan, business")
                        .eq("id", params.id)
                        .single();
                    
                    if (retryVerifyData) {
                        verifyData.business_plan = retryVerifyData.business_plan;
                        verifyData.business = retryVerifyData.business;
                    }
                }
            }
        }
        
        // Return success met duidelijke data
        const finalBusinessPlan = verifyData?.business_plan || updateResult?.business_plan || business_plan;
        const finalBusiness = verifyData?.business || {};
        const finalSubscriptionActive = finalBusiness?.subscription_active ?? !!(finalBusinessPlan && finalBusinessPlan.trim() !== '');
        
        const responseData = {
          success: true,
          data: {
            id: params.id,
            business_plan: finalBusinessPlan,
            subscription_active: finalSubscriptionActive,
            business: finalBusiness, // Include business JSONB voor debugging
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
