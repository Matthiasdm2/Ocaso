export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request) {
  const stripeSecret = getStripeSecretKey();
  const sendcloudToken = process.env.SENDCLOUD_WEBHOOK_TOKEN; // optional shared secret
  if (!stripeSecret) return NextResponse.json({ error: "Missing Stripe key" }, { status: 500 });

  // Basic auth/shared-secret validation if configured
  if (sendcloudToken) {
    const provided = req.headers.get("x-sendcloud-token");
    if (!provided || provided !== sendcloudToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json();
  // Expect an order reference that maps to listing or our order id
  const orderId: string | undefined = payload?.order_id || payload?.metadata?.order_id;
  const listingId: string | undefined = payload?.listing_id;
  const delivered: boolean = payload?.status === "delivered" || payload?.event === "parcel_status_changed" && payload?.data?.status?.message === "Delivered";

  if (!delivered) return NextResponse.json({ ok: true }); // ignore other events

  const supabase = supabaseServiceRole();

  // Find the order row by id or listing_id and requires_capture state
  let order;
  if (orderId) {
    const { data } = await supabase.from("orders").select("id, stripe_payment_intent_id").eq("id", orderId).maybeSingle();
    order = data ?? null;
  } else if (listingId) {
    const { data } = await supabase.from("orders").select("id, stripe_payment_intent_id").eq("listing_id", listingId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    order = data ?? null;
  }

  if (!order?.stripe_payment_intent_id) return NextResponse.json({ error: "No matching order" }, { status: 404 });

  const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

  try {
    await stripe.paymentIntents.capture(order.stripe_payment_intent_id);
    await supabase
      .from("orders")
      .update({ state: "captured", released_at: new Date().toISOString(), sendcloud_status: "delivered" })
      .eq("id", order.id);
  } catch (e) {
    console.error("[sendcloud/webhook] capture failed", e);
  }

  return NextResponse.json({ ok: true });
}
