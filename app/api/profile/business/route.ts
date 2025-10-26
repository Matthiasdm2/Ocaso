export const runtime = "nodejs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

/*
  GET /api/profile/business
  Returns business profile data for the authenticated user
*/
export async function GET() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      is_business, company_name, vat, registration_nr, website, invoice_email,
      invoice_address, shop_name, shop_slug, business_logo_url, business_banner_url,
      business_bio, social_instagram, social_facebook, social_tiktok,
      public_show_email, public_show_phone, categories, business_plan
    `)
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    isBusiness: data.is_business || false,
    companyName: data.company_name || "",
    vatNumber: data.vat || "",
    registrationNr: data.registration_nr || "",
    website: data.website || "",
    invoiceEmail: data.invoice_email || "",
    invoiceAddress: data.invoice_address ||
      { firstName: "", lastName: "", street: "", city: "", zip: "", country: "België" },
    shopName: data.shop_name || "",
    shopSlug: data.shop_slug || "",
    logoUrl: data.business_logo_url || "",
    bannerUrl: data.business_banner_url || "",
    description: data.business_bio || "",
    socials: {
      instagram: data.social_instagram || "",
      facebook: data.social_facebook || "",
      tiktok: data.social_tiktok || "",
    },
    public: {
      showEmail: data.public_show_email || false,
      showPhone: data.public_show_phone || false,
    },
    categories: data.categories || [],
    plan: data.business_plan || "basic",
  });
}

/*
  PUT /api/profile/business
  Body JSON: {
    companyName?, vatNumber?, registrationNr?, website?, invoiceEmail?,
    invoiceAddress?: { firstName?: string; lastName?: string; street?: string; city?: string; zip?: string; country?: string },
    shopName?, shopSlug?, description?, socials?: { instagram?, facebook?, tiktok? },
    public?: { showEmail?: boolean; showPhone?: boolean },
    categories?: string[],
    logoUrl?, bannerUrl?
  }
*/
export async function PUT(req: NextRequest) {
  const supabase = supabaseServer();
  const {
    companyName,
    vatNumber,
    registrationNr,
    website,
    invoiceEmail,
    invoiceAddress,
    shopName,
    shopSlug,
    description,
    socials,
    public: pub,
    categories,
    logoUrl,
    bannerUrl,
  } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // prepare update payload only with provided fields
  type PatchValue =
    | string
    | boolean
    | string[]
    | null
    | Record<string, unknown>;
  const patch: Record<string, PatchValue> = {
    is_business: true,
  };
  if (companyName !== undefined) patch.company_name = companyName || null;
  if (vatNumber !== undefined) patch.vat = vatNumber || null;
  if (registrationNr !== undefined) {
    patch.registration_nr = registrationNr || null;
  }
  if (website !== undefined) patch.website = website || null;
  if (invoiceEmail !== undefined) patch.invoice_email = invoiceEmail || null;
  if (invoiceAddress !== undefined) {
    const addr = invoiceAddress && typeof invoiceAddress === "object"
      ? invoiceAddress
      : null;
    patch.invoice_address = addr as unknown as Record<string, unknown>;
  }
  if (shopName !== undefined) patch.shop_name = shopName || null;
  if (shopSlug !== undefined) patch.shop_slug = shopSlug || null;
  if (description !== undefined) patch.business_bio = description || null;
  if (logoUrl !== undefined) patch.business_logo_url = logoUrl || null;
  if (bannerUrl !== undefined) patch.business_banner_url = bannerUrl || null;
  if (categories !== undefined) {
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: "categories_must_be_array" }, {
        status: 400,
      });
    }
    const cleaned = categories
      .map((c) => String(c).trim())
      .filter((c) => !!c)
      .slice(0, 8);
    patch.categories = cleaned.length ? cleaned : null;
  }
  if (socials) {
    if ("instagram" in socials) {
      patch.social_instagram = socials.instagram || null;
    }
    if ("facebook" in socials) patch.social_facebook = socials.facebook || null;
    if ("tiktok" in socials) patch.social_tiktok = socials.tiktok || null;
  }
  if (pub) {
    if ("showEmail" in pub) patch.public_show_email = !!pub.showEmail;
    if ("showPhone" in pub) patch.public_show_phone = !!pub.showPhone;
  }

  // simple slug guard
  if (
    typeof patch.shop_slug === "string" && patch.shop_slug &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(patch.shop_slug)
  ) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(patch).eq(
    "id",
    user.id,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
