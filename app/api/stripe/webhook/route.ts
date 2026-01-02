import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  getStripeSecretKey,
  getStripeWebhookSecret,
  getSupabaseServiceRoleKey,
} from "@/lib/env";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";
import { formatBusinessPlan } from "@/lib/subscription-helpers";

export const runtime = "nodejs"; // ensure Node runtime for raw body

export async function POST(req: Request) {
  const secret = getStripeWebhookSecret();
  const stripeSecret = getStripeSecretKey();
  if (!secret || !stripeSecret) {
    return NextResponse.json({ error: "Missing Stripe secrets" }, {
      status: 500,
    });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[stripe/webhook] Received event: ${event.type}`, {
    id: event.id,
  });

  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "service_role_missing" }, {
      status: 503,
    });
  }
  const supabase = supabaseServiceRole();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        const piId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

        // Check if this is a subscription checkout (has metadata)
        // Check session metadata first, fallback to payment_intent metadata
        let subscriptionMeta = session.metadata;
        if (!subscriptionMeta?.plan && piId) {
          // Try to get metadata from payment_intent
          try {
            const pi = await stripe.paymentIntents.retrieve(piId);
            if (pi.metadata?.plan) {
              subscriptionMeta = pi.metadata as Record<string, string>;
            }
          } catch (e) {
            console.warn("Could not retrieve payment_intent metadata:", e);
          }
        }
        
        if (subscriptionMeta?.plan && subscriptionMeta?.userId) {
          // Handle subscription activation
          const { plan, billing, userId } = subscriptionMeta;
          
          // Convert plan and billing to business_plan format using helper
          const planType = String(plan).toLowerCase() as "basic" | "pro";
          const billingCycle = String(billing).toLowerCase() as "monthly" | "yearly";
          const businessPlan = formatBusinessPlan(planType, billingCycle);
          
          const { error } = await supabase
            .from("profiles")
            .update({
              business_plan: businessPlan,
              business: {
                plan: planType,
                billing_cycle: billingCycle,
                subscription_active: true,
                subscription_updated_at: new Date().toISOString(),
              },
            })
            .eq("id", userId);

          if (error) {
            console.error("subscription update error:", error);
          } else {
            console.log(
              `✅ Subscription activated via checkout.session.completed: ${plan} (${billing}) -> ${businessPlan} for user ${userId}`,
            );
          }
        } else {
          // Handle marketplace order
          const { error } = await supabase
            .from("orders")
            .update({
              stripe_payment_intent_id: piId,
              state: "requires_capture",
            })
            .eq("stripe_checkout_session_id", sessionId);
          if (error) {
            console.error("orders update (checkout.session.completed)", error);
          }
        }
        break;
      }
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { error } = await supabase
          .from("orders")
          .update({ state: "requires_capture" })
          .eq("stripe_payment_intent_id", pi.id);
        if (error) {
          console.error("orders update (amount_capturable_updated)", error);
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { error } = await supabase
          .from("orders")
          .update({ state: "canceled" })
          .eq("stripe_payment_intent_id", pi.id);
        if (error) console.error("orders update (canceled)", error);
        break;
      }
      case "payment_intent.succeeded": {
        // Either a subscription (embedded Elements) or a marketplace capture
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = (pi.metadata || {}) as Record<string, string | undefined>;

        if (meta.plan && meta.userId) {
          // Embedded subscription checkout: activate on profile
          const planType = String(meta.plan).toLowerCase() as "basic" | "pro";
          const billingCycle = String(meta.billing || "monthly").toLowerCase() as "monthly" | "yearly";
          const userId = String(meta.userId);
          
          // Convert plan and billing to business_plan format using helper
          const businessPlan = formatBusinessPlan(planType, billingCycle);
          
          const { error: subErr } = await supabase
            .from("profiles")
            .update({
              business_plan: businessPlan,
              business: {
                plan: planType,
                billing_cycle: billingCycle,
                subscription_active: true,
                subscription_updated_at: new Date().toISOString(),
              },
            })
            .eq("id", userId);
          if (subErr) {
            console.error("subscription update (pi.succeeded)", subErr);
          } else {
            console.log(
              `Subscription activated via payment_intent.succeeded: ${businessPlan} for user ${userId}`,
            );
          }
        } else {
          // Marketplace order: succeeded means captured (for manual capture flows)
          const { error } = await supabase
            .from("orders")
            .update({
              state: "captured",
              released_at: new Date().toISOString(),
            })
            .eq("stripe_payment_intent_id", pi.id);
          if (error) console.error("orders update (succeeded)", error);

          // Verminder voorraad met order.quantity
          const { data: order } = await supabase
            .from("orders")
            .select("listing_id, quantity")
            .eq("stripe_payment_intent_id", pi.id)
            .single();

          if (order?.listing_id) {
            const { data: listing } = await supabase
              .from("listings")
              .select("stock")
              .eq("id", order.listing_id)
              .single();

            const quantity = order.quantity ?? 1;
            if (listing && (listing.stock ?? 1) >= quantity) {
              const { error: stockError } = await supabase
                .from("listings")
                .update({ stock: (listing.stock ?? 1) - quantity })
                .eq("id", order.listing_id);
              if (stockError) console.error("stock update error", stockError);
            }
          }
        }
        break;
      }
      case "charge.dispute.created": {
        const ch = event.data.object as Stripe.Dispute;
        const chargeId = typeof ch.charge === "string"
          ? ch.charge
          : ch.charge?.id;
        if (chargeId) {
          // Find order by matching PI via charge.payment_intent
          const piId = typeof ch.payment_intent === "string"
            ? ch.payment_intent
            : ch.payment_intent?.id;
          if (piId) {
            const { error } = await supabase
              .from("orders")
              .update({ protest_status: "filed" })
              .eq("stripe_payment_intent_id", piId);
            if (error) console.error("orders update (dispute.created)", error);
          }
        }
        break;
      }
      case "charge.dispute.closed": {
        const ch = event.data.object as Stripe.Dispute;
        const piId = typeof ch.payment_intent === "string"
          ? ch.payment_intent
          : ch.payment_intent?.id;
        if (piId) {
          const { error } = await supabase
            .from("orders")
            .update({ protest_status: "resolved" })
            .eq("stripe_payment_intent_id", piId);
          if (error) console.error("orders update (dispute.closed)", error);
        }
        break;
      }
      case "account.updated": {
        // When a connected account's requirements are satisfied and payouts are enabled,
        // mark the corresponding profile as verified so the badge appears in the UI.
        const acct = event.data.object as Stripe.Account;
        const acctId = acct.id;
        try {
          // Heuristic: if payouts_enabled is true OR requirements are empty/disabled, consider verified
          const verified = !!acct.payouts_enabled ||
            !(acct.requirements &&
              (acct.requirements.currently_due?.length ||
                acct.requirements.eventually_due?.length ||
                acct.requirements.pending_verification?.length));
          if (verified) {
            const { error } = await supabase
              .from("profiles")
              .update({
                business: { verified: true },
                stripe_account_id: acctId,
              })
              .eq("stripe_account_id", acctId);
            if (error) {
              console.error("profiles update (account.updated)", error);
            }
          }
        } catch (e) {
          console.error("account.updated handler error", e);
        }
        break;
      }
      default:
        // no-op
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook] handler error", e);
    return NextResponse.json({ received: true, error: true }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}
