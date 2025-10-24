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

    // Try to delete the Supabase Auth user first (requires service role)
    // This must be done before deleting the profile due to foreign key constraints
    console.log(`Attempting to delete auth user: ${params.id}`);
    let authUserDeleted = false;
    try {
        console.log(
            "Service role client created, key available:",
            !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        );

        // Test if service role works by trying to get user info
        const { data: userInfo, error: getError } = await admin.auth.admin
            .getUserById(params.id);
        console.log("Get user test:", {
            userExists: !!userInfo?.user,
            error: getError,
        });

        if (!getError && userInfo?.user) {
            const { data, error: authError } = await admin.auth.admin
                .deleteUser(params.id);
            console.log("deleteUser result:", { data, error: authError });
            if (!authError) {
                authUserDeleted = true;
                console.log("Auth user deleted successfully");
            } else {
                console.error("Error deleting auth user:", authError);
            }
        } else {
            console.log("Auth user not found or cannot access admin API");
        }
    } catch (error) {
        console.error("Exception deleting auth user:", error);
        // Continue with profile deletion even if auth user deletion fails
    }

    if (!authUserDeleted) {
        console.log(
            "Warning: Auth user was not deleted, but continuing with profile deletion",
        );
    }

    // Delete profile
    const { error: profileError } = await admin
        .from("profiles")
        .delete()
        .eq("id", params.id);

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, {
            status: 400,
        });
    }

    // Delete all listings associated with this user
    const { error: listingsError } = await admin
        .from("listings")
        .delete()
        .eq("seller_id", params.id);

    if (listingsError) {
        console.error("Error deleting user listings:", listingsError);
    }

    // Delete all bids placed by this user
    const { error: bidsError } = await admin
        .from("bids")
        .delete()
        .eq("bidder_id", params.id);

    if (bidsError) {
        console.error("Error deleting user bids:", bidsError);
    }

    // Delete all orders where this user is buyer or seller
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: ordersError } = await (admin as any)
        .from("orders")
        .delete()
        .or(`buyer_id.eq.${params.id},seller_id.eq.${params.id}`);

    if (ordersError) {
        console.error("Error deleting user orders:", ordersError);
    }

    // Delete all messages sent by this user
    const { error: messagesError } = await admin
        .from("messages")
        .delete()
        .eq("sender_id", params.id);

    if (messagesError) {
        console.error("Error deleting user messages:", messagesError);
    }

    // Delete conversations where this user is the only participant
    // (conversations with multiple participants should be handled differently)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: conversationsError } = await (admin as any)
        .from("conversations")
        .delete()
        .contains("participants", [params.id]);

    if (conversationsError) {
        console.error("Error deleting user conversations:", conversationsError);
    }

    return NextResponse.json({ success: true });
}
