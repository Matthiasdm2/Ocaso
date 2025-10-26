export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Protect with a simple token to prevent abuse. Configure in your scheduler.
  const token = process.env.CRON_TOKEN;
  if (token) {
    const provided = req.headers.get("x-cron-token");
    if (!provided || provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const stripeSecret = getStripeSecretKey();
  if (!stripeSecret) {
    return NextResponse.json({ error: "Missing Stripe key" }, { status: 500 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_role_missing" }, {
      status: 503,
    });
  }

  const supabase = supabaseServiceRole();
  const now = new Date().toISOString();

  // Find orders that require capture, are past capture_after, and no protest
  const { data: dueOrders, error } = await supabase
    .from("orders")
    .select("id, stripe_payment_intent_id")
    .eq("state", "requires_capture")
    .eq("protest_status", "none")
    .lte("capture_after", now)
    .limit(20); // batch size

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });
  let captured = 0;

  for (const o of dueOrders ?? []) {
    if (!o.stripe_payment_intent_id) continue;
    try {
      await stripe.paymentIntents.capture(o.stripe_payment_intent_id);
      await supabase
        .from("orders")
        .update({ state: "captured", released_at: new Date().toISOString() })
        .eq("id", o.id);
      captured++;
    } catch (e) {
      console.error("[cron/capture-due] capture failed", o.id, e);
    }
  }

  return NextResponse.json({ captured });
}
