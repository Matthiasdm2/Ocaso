// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: Request) {
  try {
  const body: unknown = await req.json().catch(() => ({}));
  const obj = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const listingId = typeof obj.listingId === "string" ? obj.listingId : undefined;
  const messageId = typeof obj.messageId === "string" ? obj.messageId : undefined;
  const quantity = Math.max(1, Number((obj as { quantity?: number | string }).quantity ?? 1));
  const shipping = obj.shipping as
      | {
          mode: "pickup" | "ship";
          contact?: { name?: string; email?: string; phone?: string };
          address?: { line1?: string; postal_code?: string; city?: string; country?: string };
        }
      | undefined;
    if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch listing from DB to trust server-side price/title/seller
    const { data: listing, error: listErr } = await supabase
      .from("listings")
    .select("id,title,price,seller_id,stock")
      .eq("id", listingId)
      .maybeSingle();
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (listing.seller_id === user.id) return NextResponse.json({ error: "Je kan je eigen listing niet kopen" }, { status: 400 });

    // Determine the price: if messageId is provided, check if it's an acceptance message and use the bid amount
    let finalPrice = listing.price;
    if (messageId) {
      // Check if this message contains the acceptance phrase
      const { data: message, error: msgErr } = await supabase
        .from("messages")
        .select("body, conversation_id")
        .eq("id", messageId)
        .eq("sender_id", listing.seller_id) // Only seller can accept bids
        .maybeSingle();
      
      if (!msgErr && message && message.body && message.body.includes("Uw bod werd aanvaard")) {
        // This is a valid acceptance message - find the highest bid from this user on this listing
        const { data: userBids, error: bidsErr } = await supabase
          .from("bids")
          .select("amount")
          .eq("listing_id", listingId)
          .eq("bidder_id", user.id)
          .order("amount", { ascending: false })
          .limit(1);
        
        if (!bidsErr && userBids && userBids.length > 0) {
          finalPrice = userBids[0].amount;
        }
      }
    }

    // Get seller's connected account id
    const { data: sellerProfile, error: profErr } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", listing.seller_id)
      .maybeSingle();
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    const destination = sellerProfile?.stripe_account_id;
    if (!destination) {
      return NextResponse.json({ error: "Verkoper moet Stripe onboarding afronden" }, { status: 409 });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || req.headers.get("referer") || process.env.NEXT_PUBLIC_SITE_URL || "";
    // Validate quantity against stock if stock set
    const available = typeof (listing as { stock?: number | null }).stock === 'number' ? (listing as { stock?: number | null }).stock : null;
    if (available != null && quantity > available) {
      return NextResponse.json({ error: "Niet genoeg voorraad" }, { status: 409 });
    }
    const unit_amount = Math.round(Number(finalPrice) * 100);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: listing.title },
            unit_amount,
          },
          quantity,
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
        transfer_data: { destination },
        // Optional: marketplace fee in cents
        // application_fee_amount: Math.round(unit_amount * 0.1),
        metadata: {
          listingId: String(listing.id),
          buyerId: user.id,
          sellerId: listing.seller_id,
          quantity: String(quantity),
          shipMode: shipping?.mode ?? "pickup",
          shipName: shipping?.contact?.name ?? "",
          shipEmail: shipping?.contact?.email ?? "",
          shipPhone: shipping?.contact?.phone ?? "",
          shipLine1: shipping?.address?.line1 ?? "",
          shipPostal: shipping?.address?.postal_code ?? "",
          shipCity: shipping?.address?.city ?? "",
          shipCountry: shipping?.address?.country ?? "",
        },
      },
      customer_email: shipping?.contact?.email || undefined,
      metadata: {
        listingId: String(listing.id),
        buyerId: user.id,
        sellerId: listing.seller_id,
        quantity: String(quantity),
        shipMode: shipping?.mode ?? "pickup",
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/listings/${encodeURIComponent(listingId)}`,
    });

    // Create order row to track
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const admin = supabaseServiceRole();
  await admin
      .from("orders")
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        price_cents: unit_amount,
        currency: "eur",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: piId ?? null,
        capture_after: twoDaysFromNow,
        state: "created",
  quantity,
        shipping_details: shipping ? {
          mode: shipping.mode,
          contact: shipping.contact ?? null,
          address: shipping.address ?? null,
        } : null,
      });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
