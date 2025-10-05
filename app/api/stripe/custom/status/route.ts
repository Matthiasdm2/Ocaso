import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
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
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "") || null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      token as string,
    ).catch(() => ({
      data: { user: null },
      error: { message: "auth_failed" },
    }));
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profileRow, error: profErr } = await supabase.from("profiles")
      .select("stripe_account_id").eq("id", user.id).maybeSingle();
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }
    const accountId = profileRow?.stripe_account_id;
    if (!accountId) {
      return NextResponse.json({
        status: "not_onboarded",
        message: "Nog niet geregistreerd als geverifieerde verkoper",
      });
    }

    const account = await stripe.accounts.retrieve(accountId);

    let status: "pending" | "approved" | "rejected" | "incomplete" =
      "incomplete";
    let message = "KYC aanvraag onvolledig";

    if (account.details_submitted) {
      if (account.charges_enabled) {
        status = "approved";
        message = "Goedgekeurd - je kunt betalingen ontvangen";
      } else if (account.requirements?.disabled_reason) {
        status = "rejected";
        message = `Afgekeurd: ${account.requirements.disabled_reason}`;
      } else {
        status = "pending";
        message = "Aanvraag in verwerking bij Stripe";
      }
    } else {
      status = "incomplete";
      message = "KYC gegevens nog niet volledig ingediend";
    }

    return NextResponse.json({
      status,
      message,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
      },
    });
  } catch (e) {
    console.error("stripe/custom/status error", e);
    return NextResponse.json({ error: "Status ophalen mislukt" }, {
      status: 500,
    });
  }
}
