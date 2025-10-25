export const runtime = "nodejs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      console.error("Missing STRIPE_SECRET_KEY");
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, {
        status: 500,
      });
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    const raw = await req.json().catch(() => ({})) as unknown;
    const body = typeof raw === "object" && raw !== null
      ? raw as Record<string, unknown>
      : {};
    const accountId = typeof body.accountId === "string"
      ? body.accountId
      : undefined;
    const bankToken = typeof body.bankToken === "string"
      ? body.bankToken
      : undefined;
    if (!accountId) {
      return NextResponse.json({ error: "accountId ontbreekt" }, {
        status: 400,
      });
    }
    if (!bankToken) {
      return NextResponse.json({ error: "bankToken ontbreekt" }, {
        status: 400,
      });
    }

    // Attach bank token as external account to the connected account
    const accounts = stripe.accounts as Stripe.AccountsResource;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ext = await (accounts as any).createExternalAccount(accountId, {
      external_account: bankToken,
    });

    return NextResponse.json({ external_account: ext });
  } catch (e) {
    console.error("external-account error", e);
    const message = e instanceof Error ? e.message : "onbekende fout";
    return NextResponse.json({ error: "external_failed", details: message }, {
      status: 500,
    });
  }
}
