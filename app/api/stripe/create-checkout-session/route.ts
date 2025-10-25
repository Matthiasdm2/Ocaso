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

        const stripe = new Stripe(stripeSecret, {
            apiVersion: "2025-08-27.basil",
        });

        // Auth via Supabase session token (Bearer)
        const auth = req.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "") || null;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const supabase = supabaseServiceRole();
        const { data: { user }, error: userErr } = await supabase.auth.getUser(
            token,
        );
        if (userErr || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Try to prefill customer email from profile invoice email or auth email
        let customerEmail: string | undefined = user.email || undefined;
        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("invoice_email")
                .eq("id", user.id)
                .single();
            if (profile?.invoice_email) customerEmail = profile.invoice_email;
        } catch {
            // ignore profile fetch errors
        }

        const { plan, billing, buyerType } = await req.json();
        if (!plan || !billing) {
            return NextResponse.json({ error: "Missing plan or billing" }, {
                status: 400,
            });
        }

        // Amounts in cents
        const prices = {
            basic: { monthly: 1500, yearly: 15000 },
            pro: { monthly: 2500, yearly: 24000 },
        } as const;

        type Plan = keyof typeof prices;
        type Cycle = keyof (typeof prices)[Plan];
        const planKey = String(plan) as Plan;
        const cycleKey = String(billing) as Cycle;
        const amount = prices[planKey]?.[cycleKey];
        if (!amount) {
            return NextResponse.json(
                { error: "Invalid plan or billing cycle" },
                { status: 400 },
            );
        }

        // Build return URL based on request origin
        const url = new URL(req.url);
        const origin = url.origin;
        const returnUrl = `${origin}/profile/business?success=true&plan=${
            encodeURIComponent(plan)
        }&billing=${
            encodeURIComponent(billing)
        }&session_id={CHECKOUT_SESSION_ID}`;

        const session = await stripe.checkout.sessions.create({
            ui_mode: "embedded",
            mode: "payment",
            return_url: returnUrl,
            customer_email: customerEmail,
            metadata: {
                userId: user.id,
                plan,
                billing,
                buyerType: buyerType === "business" ? "business" : "consumer",
            },
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: "eur",
                        unit_amount: amount,
                        product_data: {
                            name: `OCASO ${String(plan).toUpperCase()} (${
                                billing === "monthly"
                                    ? "Maandelijks"
                                    : "Jaarlijks"
                            })`,
                        },
                    },
                },
            ],
            // Automatic payment methods inside Checkout
            automatic_tax: { enabled: false },
            phone_number_collection: { enabled: false },
        });

        return NextResponse.json({ clientSecret: session.client_secret });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
