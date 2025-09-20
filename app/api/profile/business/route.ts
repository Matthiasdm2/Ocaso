import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabaseServer';

/*
  PUT /api/profile/business
  Body JSON: {
    companyName?, vatNumber?, registrationNr?, website?, invoiceEmail?,
  shopName?, shopSlug?, description?, socials?: { instagram?, facebook?, tiktok? },
  public?: { showEmail?: boolean; showPhone?: boolean },
  categories?: string[],
    logoUrl?, bannerUrl?
  }
*/
export async function PUT(req: NextRequest) {
  const supabase = supabaseServer();
  const {
    companyName, vatNumber, registrationNr, website, invoiceEmail,
  shopName, shopSlug, description, socials, public: pub, categories, logoUrl, bannerUrl,
  } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // prepare update payload only with provided fields
  const patch: { [k: string]: string | boolean | string[] | null } = { is_business: true };
  if (companyName !== undefined) patch.company_name = companyName || null;
  if (vatNumber !== undefined) patch.vat = vatNumber || null;
  if (registrationNr !== undefined) patch.registration_nr = registrationNr || null;
  if (website !== undefined) patch.website = website || null;
  if (invoiceEmail !== undefined) patch.invoice_email = invoiceEmail || null;
  if (shopName !== undefined) patch.shop_name = shopName || null;
  if (shopSlug !== undefined) patch.shop_slug = shopSlug || null;
  if (description !== undefined) patch.business_bio = description || null;
  if (logoUrl !== undefined) patch.business_logo_url = logoUrl || null;
  if (bannerUrl !== undefined) patch.business_banner_url = bannerUrl || null;
  if (categories !== undefined) {
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'categories_must_be_array' }, { status: 400 });
    }
    const cleaned = categories
      .map(c => String(c).trim())
      .filter(c => !!c)
      .slice(0, 8);
    patch.categories = cleaned.length ? cleaned : null;
  }
  if (socials) {
    if ('instagram' in socials) patch.social_instagram = socials.instagram || null;
    if ('facebook' in socials) patch.social_facebook = socials.facebook || null;
    if ('tiktok' in socials) patch.social_tiktok = socials.tiktok || null;
  }
  if (pub) {
    if ('showEmail' in pub) patch.public_show_email = !!pub.showEmail;
    if ('showPhone' in pub) patch.public_show_phone = !!pub.showPhone;
  }

  // simple slug guard
  if (typeof patch.shop_slug === 'string' && patch.shop_slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(patch.shop_slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
