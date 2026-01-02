import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PUT(
    req: Request,
    { params }: { params: { id: string } },
) {
    const body = await req.json();
    const { is_admin, password, ...profileUpdates } = body;

    // Update profile
    const profileUpdate: Record<string, unknown> = { ...profileUpdates };
    if (is_admin !== undefined) profileUpdate.is_admin = is_admin;

    const admin = supabaseAdmin();

    if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await admin
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
        const { error: authError } = await admin.auth.admin.updateUserById(
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
    const admin = supabaseAdmin();

    // CRITICAL: Delete auth user FIRST, otherwise trigger will recreate profile
    // The handle_new_user trigger automatically creates a profile when auth.users row exists
    console.log(`🗑️ Attempting to delete user: ${params.id}`);
    
    let authUserDeleted = false;
    let authError: Error | null = null;
    
    try {
        // Check if user exists first
        const { data: userInfo, error: getError } = await admin.auth.admin
            .getUserById(params.id);
        
        console.log("User lookup:", {
            exists: !!userInfo?.user,
            email: userInfo?.user?.email,
            error: getError?.message,
        });

        if (getError) {
            console.warn("⚠️ Could not lookup user:", getError.message);
            // User might not exist in auth, continue with profile deletion
        } else if (userInfo?.user) {
            // User exists, delete it
            const { error: deleteError } = await admin.auth.admin.deleteUser(params.id);
            
            if (deleteError) {
                authError = deleteError as Error;
                console.error("❌ Failed to delete auth user:", deleteError.message);
                return NextResponse.json({ 
                    error: `Kon auth gebruiker niet verwijderen: ${deleteError.message}`,
                    details: "Als de auth gebruiker niet wordt verwijderd, maakt de handle_new_user trigger het profiel automatisch opnieuw aan."
                }, { status: 500 });
            } else {
                // Verify deletion by checking again
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit
                const { data: verifyUser, error: verifyError } = await admin.auth.admin.getUserById(params.id);
                
                if (verifyError || !verifyUser?.user) {
                    authUserDeleted = true;
                    console.log("✅ Auth user deleted successfully (verified)");
                } else {
                    console.error("❌ Auth user still exists after deletion attempt!");
                    return NextResponse.json({ 
                        error: "Auth gebruiker verwijdering mislukt - gebruiker bestaat nog steeds",
                        details: "Dit kan gebeuren als de service role key niet de juiste permissions heeft."
                    }, { status: 500 });
                }
            }
        } else {
            console.log("ℹ️ Auth user not found, may already be deleted");
            // If auth user doesn't exist, we can safely delete profile
            authUserDeleted = true; // Mark as deleted since it doesn't exist
        }
    } catch (error) {
        console.error("❌ Exception deleting auth user:", error);
        return NextResponse.json({ 
            error: `Fout bij verwijderen auth gebruiker: ${error instanceof Error ? error.message : "Onbekende fout"}` 
        }, { status: 500 });
    }

    // Delete profile (will be cascade deleted if auth user was deleted, but delete explicitly anyway)
    const { error: profileError } = await admin
        .from("profiles")
        .delete()
        .eq("id", params.id);

    if (profileError) {
        console.error("❌ Failed to delete profile:", profileError.message);
        // If auth user was deleted but profile deletion fails, this is a problem
        if (authUserDeleted) {
            return NextResponse.json({ 
                error: `Auth gebruiker verwijderd, maar profiel verwijderen mislukt: ${profileError.message}`,
                warning: "Auth user was deleted but profile deletion failed"
            }, { status: 500 });
        }
        return NextResponse.json({ error: profileError.message }, {
            status: 400,
        });
    }

    console.log("✅ Profile deleted successfully");

    // Delete related data (non-critical, log errors but don't fail)
    try {
        // Delete all listings associated with this user
        const { error: listingsError } = await admin
            .from("listings")
            .delete()
            .eq("seller_id", params.id);
        if (listingsError) {
            console.warn("⚠️ Error deleting user listings:", listingsError.message);
        }

        // Delete all bids placed by this user
        const { error: bidsError } = await admin
            .from("bids")
            .delete()
            .eq("bidder_id", params.id);
        if (bidsError) {
            console.warn("⚠️ Error deleting user bids:", bidsError.message);
        }

        // Delete all orders where this user is buyer or seller
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: ordersError } = await (admin as any)
            .from("orders")
            .delete()
            .or(`buyer_id.eq.${params.id},seller_id.eq.${params.id}`);
        if (ordersError) {
            console.warn("⚠️ Error deleting user orders:", ordersError.message);
        }

        // Delete all messages sent by this user
        const { error: messagesError } = await admin
            .from("messages")
            .delete()
            .eq("sender_id", params.id);
        if (messagesError) {
            console.warn("⚠️ Error deleting user messages:", messagesError.message);
        }

        // Delete conversations where this user is the only participant
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: conversationsError } = await (admin as any)
            .from("conversations")
            .delete()
            .contains("participants", [params.id]);
        if (conversationsError) {
            console.warn("⚠️ Error deleting user conversations:", conversationsError.message);
        }
    } catch (relatedDataError) {
        console.warn("⚠️ Error deleting related data:", relatedDataError);
        // Don't fail the entire operation if related data deletion fails
    }

    console.log(`✅ User ${params.id} successfully deleted (auth: ${authUserDeleted ? 'yes' : 'no'}, profile: yes)`);
    
    return NextResponse.json({ 
        success: true,
        authUserDeleted,
        message: "Gebruiker succesvol verwijderd"
    });
}
