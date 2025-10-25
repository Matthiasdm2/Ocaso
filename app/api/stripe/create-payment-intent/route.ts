export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, {
        status: 500,
      });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    // Get auth token from header
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "") || null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user
    const supabase = supabaseServiceRole();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      token,
    );
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { plan, billing } = await req.json();
    if (!plan || !billing) {
      return NextResponse.json({ error: "Missing plan or billing" }, {
        status: 400,
      });
    }

    // Define prices
    const prices = {
      basic: {
        monthly: 1500, // €15.00 in cents
        yearly: 15000, // €150.00 in cents
      },
      pro: {
        monthly: 2500, // €25.00 in cents
        yearly: 24000, // €240.00 in cents
      },
    };

    const amount = prices[plan as keyof typeof prices]
      ?.[billing as keyof typeof prices.basic];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan or billing cycle" }, {
        status: 400,
      });
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      metadata: {
        userId: user.id,
        plan,
        billing,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
