export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/connect/onboard
 * Creates (or reuses) a Standard connected account for the current user and returns an Account Link URL.
 */
export async function POST(req: Request) {
  try {
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, {
        status: 500,
      });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    // Fetch existing stripe_account_id
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    let accountId = profile?.stripe_account_id ?? null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: user.email ?? undefined,
      });
      accountId = account.id;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") ||
      process.env.NEXT_PUBLIC_SITE_URL || "";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/profile/stripe/refresh`,
      return_url: `${origin}/profile/stripe/return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (e) {
    console.error("connect/onboard error", e);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }
}
