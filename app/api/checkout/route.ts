// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const { listingId, title, price } = await req.json();
    if (!listingId || !title || typeof price !== "number" || price <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-08-27.basil",
    });

    const origin =
      req.headers.get("origin") || req.headers.get("referer") || "";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: title },
            unit_amount: Math.round(price * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: { listingId },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/listings/${encodeURIComponent(listingId)}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
