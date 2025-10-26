import { NextResponse } from "next/server";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request) {
  try {
    // Skip signature verification for testing
    const body = await req.json();
    const { type, userId, credits } = body;

    console.log(`[webhook/test] Simulating event: ${type}`, { userId, credits });

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
        return NextResponse.json({ error: "Update failed", details: upErr }, { status: 500 });
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

      console.log(`Test credits topped up: +${credits} for user ${userId} (new balance: ${newCredits})`);

      return NextResponse.json({
        success: true,
        message: `Credits updated: ${current} → ${newCredits}`,
        userId,
        creditsAdded: credits,
        newBalance: newCredits
      });
    }

    return NextResponse.json({ error: "Invalid test request" }, { status: 400 });

  } catch (error) {
    console.error("[webhook/test] Error:", error);
    return NextResponse.json({
      error: "Test failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
