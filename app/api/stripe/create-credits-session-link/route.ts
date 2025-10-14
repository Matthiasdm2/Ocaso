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

        const { credits } = await req.json();
        const qty = Number(credits);
        if (!qty || ![4, 25].includes(qty)) {
            return NextResponse.json({ error: "Invalid credits package" }, {
                status: 400,
            });
        }

        const pricing: Record<number, number> = { 4: 100, 25: 500 };
        const amount = pricing[qty];

        // Prefill email (optional)
        let customerEmail: string | undefined = user.email || undefined;
        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("invoice_email")
                .eq("id", user.id)
                .single();
            if (profile?.invoice_email) customerEmail = profile.invoice_email;
        } catch {
            // ignore profile email fetch errors
        }

        const url = new URL(req.url);
        const origin = url.origin;
        const success_url =
            `${origin}/profile?credits_success=true&session_id={CHECKOUT_SESSION_ID}`;
        const cancel_url = `${origin}/profile`;

        const metadata = {
            type: "credits",
            userId: user.id,
            credits: String(qty),
        } as const;

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            success_url,
            cancel_url,
            customer_email: customerEmail,
            metadata,
            payment_intent_data: { metadata },
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: "eur",
                    unit_amount: amount,
                    product_data: { name: `OCASO Credits (${qty})` },
                },
            }],
        });

        return NextResponse.json({ url: session.url });
    } catch (e) {
        console.error("create-credits-session-link error", e);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
