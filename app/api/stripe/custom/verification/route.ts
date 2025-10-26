export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId parameter required" }, {
        status: 400,
      });
    }

    const stripeSecret = getStripeSecretKey();
    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, {
        status: 500,
      });
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "service_role_missing" }, {
        status: 503,
      });
    }
    const supabase = supabaseServiceRole();

    const { data: profileRow, error: profErr } = await supabase.from("profiles")
      .select("stripe_account_id").eq("id", userId).maybeSingle();
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const accountId = profileRow?.stripe_account_id;
    if (!accountId) {
      return NextResponse.json({ verified: false });
    }

    const account = await stripe.accounts.retrieve(accountId);

    // Consider verified if details_submitted is true (they have completed KYC)
    const verified = account.details_submitted === true;

    return NextResponse.json({ verified });
  } catch (e) {
    console.error("stripe/custom/verification error", e);
    return NextResponse.json({ error: "Verification check failed" }, {
      status: 500,
    });
  }
}
