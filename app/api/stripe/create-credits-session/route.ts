export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request) {
    try {
        const stripeSecret = getStripeSecretKey();
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

        // Parse request body
        let credits, buyerType, creditQty;
        try {
            const body = await req.json();
            credits = body.credits;
            buyerType = body.buyerType;
            creditQty = Number(credits);
        } catch (parseError) {
            console.error("Failed to parse request body:", parseError);
            return NextResponse.json({ error: "Invalid request body" }, {
                status: 400,
            });
        }

        if (!creditQty || ![10, 25].includes(creditQty)) {
            return NextResponse.json({ error: "Invalid credits package" }, {
                status: 400,
            });
        }

        // Server-side pricing map (in cents) to avoid client tampering
        const pricing: Record<number, number> = {
            10: 100, // €1.00
            25: 500, // €5.00
        };
        const amount = pricing[creditQty];

        // Return URL
        const url = new URL(req.url);
        const origin = url.origin;
        const returnUrl =
            `${origin}/profile?credits_success=true&session_id={CHECKOUT_SESSION_ID}`;

        // Prefill customer details from profile if available
        let customerEmail: string | undefined = user.email || undefined;
        let customerName: string | undefined;
        let customerAddress: Stripe.AddressParam | undefined;
        
        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, invoice_email, invoice_address")
                .eq("id", user.id)
                .single();
            
            if (profile?.invoice_email) customerEmail = profile.invoice_email;
            if (profile?.full_name) customerName = profile.full_name;
            
            // Parse invoice address for Stripe customer
            if (profile?.invoice_address && typeof profile.invoice_address === 'object') {
                const addr = profile.invoice_address as Record<string, string>;
                if (addr.street || addr.city || addr.zip || addr.country) {
                    customerAddress = {
                        line1: addr.street || undefined,
                        city: addr.city || undefined,
                        postal_code: addr.zip || undefined,
                        country: addr.country || 'BE', // Default to Belgium
                    };
                }
            }
        } catch {
            // ignore
        }

        // Create or update Stripe customer with user details
        let stripeCustomerId: string | undefined;
        try {
            // Try to find existing customer by email
            const existingCustomers = await stripe.customers.list({
                email: customerEmail,
                limit: 1,
            });
            
            if (existingCustomers.data.length > 0) {
                // Update existing customer
                await stripe.customers.update(existingCustomers.data[0].id, {
                    name: customerName,
                    address: customerAddress,
                    metadata: {
                        userId: user.id,
                    },
                });
                stripeCustomerId = existingCustomers.data[0].id;
            } else {
                // Create new customer
                const newCustomer = await stripe.customers.create({
                    email: customerEmail,
                    name: customerName,
                    address: customerAddress,
                    metadata: {
                        userId: user.id,
                    },
                });
                stripeCustomerId = newCustomer.id;
            }
        } catch (customerError) {
            console.warn("Could not create/update Stripe customer:", customerError);
            // Continue without customer prefill if this fails
        }

        const metadata = {
            type: "credits",
            userId: user.id,
            credits: String(creditQty),
            buyerType: buyerType === "business" ? "business" : "consumer",
        } as const;

        // Create checkout session
        let session;
        try {
            session = await stripe.checkout.sessions.create({
                ui_mode: "embedded", // Use embedded mode
                mode: "payment",
                return_url: returnUrl,
                customer: stripeCustomerId, // Use the customer we created/updated
                customer_email: stripeCustomerId ? undefined : customerEmail, // Only use email if no customer
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
                billing_address_collection: 'required', // Always collect billing address
            });
        } catch (sessionError) {
            console.error("Failed to create Stripe checkout session:", sessionError);
            throw new Error("Failed to create checkout session");
        }

        // Build prefilled checkout URL for redirect (fallback)
        let checkoutUrl = session.url;
        if (checkoutUrl) {
            const params = new URLSearchParams();
            
            if (customerEmail) params.append('prefilled_email', customerEmail);
            if (customerName) params.append('prefilled_name', customerName);
            if (customerAddress?.line1) params.append('prefilled_address[line1]', customerAddress.line1);
            if (customerAddress?.city) params.append('prefilled_address[city]', customerAddress.city);
            if (customerAddress?.postal_code) params.append('prefilled_address[postal_code]', customerAddress.postal_code);
            if (customerAddress?.country) params.append('prefilled_address[country]', customerAddress.country);

            if (params.toString()) {
                checkoutUrl += `?${params.toString()}`;
            }
        }

        return NextResponse.json({ 
            clientSecret: session.client_secret, // Return clientSecret for embedded checkout
            url: checkoutUrl, // Also provide URL as fallback
            prefillData: {
                name: customerName,
                email: customerEmail,
                address: customerAddress ? {
                    line1: customerAddress.line1,
                    city: customerAddress.city,
                    postal_code: customerAddress.postal_code,
                    country: customerAddress.country,
                } : undefined,
            }
        });
    } catch (error) {
        console.error("Error creating credits checkout session:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
