// app/api/profile/upsert-from-auth/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = supabaseServer();

    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract metadata from auth user with priority handling
    const metadata = user.user_metadata || {};

    // Full name priority: full_name -> name -> (first_name + last_name) -> (given_name + family_name)
    const full_name = metadata.full_name ||
                     metadata.name ||
                     [metadata.first_name, metadata.last_name]
                       .filter(Boolean)
                       .join(' ') ||
                     [metadata.given_name, metadata.family_name]
                       .filter(Boolean)
                       .join(' ') ||
                     null;

    // Avatar URL priority: avatar_url -> picture -> avatar
    const avatar_url = metadata.avatar_url ||
                      metadata.picture ||
                      metadata.avatar ||
                      null;

    // Extract first/last names (support both first_name/last_name and given_name/family_name)
    let first_name = metadata.first_name || metadata.given_name || null;
    let last_name = metadata.last_name || metadata.family_name || null;

    // If we have a full_name but no first/last, try to split it
    if (full_name && !first_name && !last_name) {
      const parts = full_name.trim().split(' ');
      if (parts.length >= 2) {
        first_name = parts[0];
        last_name = parts.slice(1).join(' ');
      } else if (parts.length === 1) {
        first_name = parts[0];
      }
    }

    // Extract phone
    const phone = metadata.phone || null;

    // Extract and transform address
    let address = null;
    if (metadata.address) {
      const addr = metadata.address;
      // Combine street, number, and bus
      let street = addr.street || '';
      if (addr.number) {
        street = `${street} ${addr.number}`.trim();
      }
      if (addr.bus) {
        street = `${street} bus ${addr.bus}`.trim();
      }
      
      address = {
        street: street,
        city: addr.city || '',
        zip: addr.postal || addr.zip || '',
        country: addr.country || 'België',
      };
    }

    // Extract business fields
    const is_business = metadata.is_business || false;
    const company_name = metadata.company_name || null;
    const vat = metadata.vat || null;
    const website = metadata.website || null;
    const iban = metadata.iban || null;

    // Build bank object if IBAN exists
    let bank = null;
    if (iban) {
      bank = { iban, bic: '' };
    }

    // Extract marketing opt-in and build preferences
    const marketing_opt_in = metadata.marketing_opt_in || false;
    const preferences = {
      language: 'nl',
      newsletter: marketing_opt_in,
      marketing_opt_in: marketing_opt_in,
    };

    // Upsert profile with auth metadata
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: full_name,
        first_name: first_name,
        last_name: last_name,
        avatar_url: avatar_url,
        phone: phone,
        address: address,
        is_business: is_business,
        company_name: company_name,
        vat: vat,
        website: website,
        bank: bank,
        preferences: preferences,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Profile upsert error:', upsertError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profile
    });

  } catch (error) {
    console.error('Upsert from auth error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
