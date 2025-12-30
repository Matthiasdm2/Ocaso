export const runtime = "nodejs";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export const dynamic = "force-dynamic";

type BusinessUpsertPayload = Partial<{
  shop_name: string | null;
  shop_slug: string | null;
  business_logo_url: string | null;
  business_banner_url: string | null;
  business_bio: string | null;
  website: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  public_show_email: boolean;
  public_show_phone: boolean;
  company_name: string | null;
  vat: string | null;
  registration_nr: string | null;
  invoice_email: string | null;
  bank: { iban?: string; bic?: string } | null;
  invoice_address: Record<string, unknown> | null;
}>;

/**
 * PUT /api/profile/business/upsert
 * 
 * Saves business/shop profile data.
 * REQUIRES: Active subscription (subscription_active = true)
 * Returns 403 Forbidden if subscription is not active.
 */
export async function PUT(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7)
    : null;
    
  let user = null;
  
  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const alt = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const got = await alt.auth.getUser();
    user = got.data.user;
  }
  
  if (!user) {
    const anon = supabaseServer();
    const { data: { user: serverUser } } = await anon.auth.getUser();
    user = serverUser;
  }

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: BusinessUpsertPayload = {};
  try {
    body = await req.json() as BusinessUpsertPayload;
  } catch { /* ignore */ }

  // Check subscription status before allowing shop data updates
  try {
    const service = supabaseServiceRole();
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("business")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Error checking subscription status:", profileError);
      return NextResponse.json(
        { error: "Kan abonnement niet verifiëren" },
        { status: 500 }
      );
    }

    // Extract subscription_active from business JSONB
    const business = profile.business as Record<string, unknown> | null;
    const subscriptionActive = business?.subscription_active === true;

    if (!subscriptionActive) {
      return NextResponse.json(
        { error: "Abonnement niet actief. Activeer een abonnement om shop gegevens op te slaan." },
        { status: 403 }
      );
    }

    // Allowed columns for shop data
    const allowed: BusinessUpsertPayload & { id?: string } = {};
    const allowKeys = [
      "shop_name",
      "shop_slug",
      "business_logo_url",
      "business_banner_url",
      "business_bio",
      "website",
      "social_instagram",
      "social_facebook",
      "social_tiktok",
      "public_show_email",
      "public_show_phone",
      "company_name",
      "vat",
      "registration_nr",
      "invoice_email",
      "bank",
      "invoice_address",
    ] as const satisfies Readonly<Array<keyof BusinessUpsertPayload>>;

    const assign = <K extends keyof BusinessUpsertPayload>(key: K) => {
      const v = body[key];
      if (typeof v !== "undefined") {
        allowed[key] = v;
      }
    };
    for (const k of allowKeys) assign(k);
    allowed.id = user.id;

    const { data: upserted, error } = await service
      .from("profiles")
      .upsert(allowed, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Upsert error:", error);
      return NextResponse.json(
        { error: "Opslaan mislukt" },
        { status: 400 }
      );
    }

    return NextResponse.json({ profile: upserted }, { status: 200 });
  } catch (e) {
    console.error("Business upsert error:", e);
    return NextResponse.json(
      { error: "Onverwachte fout" },
      { status: 500 }
    );
  }
}
