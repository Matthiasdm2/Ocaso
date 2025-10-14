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

        const { credits, buyerType } = await req.json();
        const creditQty = Number(credits);
        if (!creditQty || ![4, 25].includes(creditQty)) {
            return NextResponse.json({ error: "Invalid credits package" }, {
                status: 400,
            });
        }

        // Server-side pricing map (in cents) to avoid client tampering
        const pricing: Record<number, number> = {
            4: 100, // €1.00
            25: 500, // €5.00
        };
        const amount = pricing[creditQty];

        // Return URL
        const url = new URL(req.url);
        const origin = url.origin;
        const returnUrl =
            `${origin}/profile?credits_success=true&session_id={CHECKOUT_SESSION_ID}`;

        // Prefill email from profile if available
        let customerEmail: string | undefined = user.email || undefined;
        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("invoice_email")
                .eq("id", user.id)
                .single();
            if (profile?.invoice_email) customerEmail = profile.invoice_email;
        } catch {
            // ignore
        }

        const metadata = {
            type: "credits",
            userId: user.id,
            credits: String(creditQty),
            buyerType: buyerType === "business" ? "business" : "consumer",
        } as const;

        const session = await stripe.checkout.sessions.create({
            ui_mode: "embedded",
            mode: "payment",
            return_url: returnUrl,
            customer_email: customerEmail,
            metadata,
            payment_intent_data: { metadata },
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: "eur",
                        unit_amount: amount,
                        product_data: {
                            name: `OCASO Credits (${creditQty})`,
                        },
                    },
                },
            ],
            automatic_tax: { enabled: false },
            phone_number_collection: { enabled: false },
        });

        return NextResponse.json({ clientSecret: session.client_secret });
    } catch (error) {
        console.error("Error creating credits checkout session:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
