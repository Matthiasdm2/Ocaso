import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request) {
    try {
        // Skip signature verification for testing
        const body = await req.json();
        const { type, userId, credits, conversationId } = body;

        console.log(`[webhook/test] Received body:`, JSON.stringify(body));
        console.log(`[webhook/test] Simulating event: ${type}`, {
            userId,
            credits,
            conversationId,
        });

        if (type === "test_conversation" && conversationId) {
            console.log(
                `[webhook/test] Testing conversation: ${conversationId}`,
            );
            // Test if conversation exists
            const supabase = supabaseServiceRole();

            const { data: conv, error } = await supabase
                .from("conversations")
                .select("*")
                .eq("id", conversationId)
                .single();

            console.log(`[webhook/test] Query result:`, {
                conv: !!conv,
                error,
            });

            if (error) {
                return NextResponse.json({
                    error: "Conversation query failed",
                    details: error,
                }, { status: 500 });
            }

            if (!conv) {
                return NextResponse.json({
                    error: "Conversation not found",
                    conversationId,
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                conversation: conv,
            });
        }

        if (type === "fix_rls") {
            console.log(`[webhook/test] Fixing RLS policies...`);
            const supabase = supabaseServiceRole();

            // Drop old policies
            await supabase.rpc("exec_sql", {
                sql: 'DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;',
            });
            await supabase.rpc("exec_sql", {
                sql: 'DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;',
            });
            await supabase.rpc("exec_sql", {
                sql: 'DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;',
            });
            await supabase.rpc("exec_sql", {
                sql: 'DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;',
            });

            // Create new policies
            await supabase.rpc("exec_sql", {
                sql: 'CREATE POLICY "conversations_participant_select" ON public.conversations FOR SELECT USING (auth.uid() = ANY(participants));',
            });
            await supabase.rpc("exec_sql", {
                sql: 'CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participants));',
            });
            await supabase.rpc("exec_sql", {
                sql: 'CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)));',
            });
            await supabase.rpc("exec_sql", {
                sql: 'CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)));',
            });

            return NextResponse.json({
                success: true,
                message: "RLS policies fixed",
            });
        }

        if (type === "payment_intent.succeeded" && userId && credits) {
            // Simulate credit top-up
            const supabase = supabaseServiceRole();

            // Fetch current credits
            const { data: profile } = await supabase
                .from("profiles")
                .select("ocaso_credits")
                .eq("id", userId)
                .single();

            const current = (profile?.ocaso_credits as number | null) ?? 0;
            const newCredits = current + credits;

            // Update credits
            const { error: upErr } = await supabase
                .from("profiles")
                .update({ ocaso_credits: newCredits })
                .eq("id", userId);

            if (upErr) {
                console.error("Test credits update failed", upErr);
                return NextResponse.json({
                    error: "Update failed",
                    details: upErr,
                }, { status: 500 });
            }

            // Log credit transaction
            const { error: txErr } = await supabase
                .from("credit_transactions")
                .insert({
                    user_id: userId,
                    amount: credits,
                    transaction_type: "purchase",
                    description: `Test credits: ${credits}`,
                    reference_id: null,
                });

            if (txErr) {
                console.error("Test credit transaction logging failed", txErr);
            }

            console.log(
                `Test credits topped up: +${credits} for user ${userId} (new balance: ${newCredits})`,
            );

            return NextResponse.json({
                success: true,
                message: `Credits updated: ${current} → ${newCredits}`,
                userId,
                creditsAdded: credits,
                newBalance: newCredits,
            });
        }

        return NextResponse.json({ error: "Invalid test request" }, {
            status: 400,
        });
    } catch (error) {
        console.error("[webhook/test] Error:", error);
        return NextResponse.json({
            error: "Test failed",
            message: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
