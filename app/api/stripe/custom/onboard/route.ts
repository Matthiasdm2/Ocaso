import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { supabaseServiceRole } from '@/lib/supabaseServiceRole';

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });

    // Expect authenticated user via Supabase cookie in server environment
    const supabase = supabaseServiceRole();
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '') || null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Validate session to get user id
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token as string).catch(() => ({ data: { user: null }, error: { message: 'auth_failed' } }));
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if account already exists
    const { data: profileRow, error: profErr } = await supabase.from('profiles').select('stripe_account_id').eq('id', user.id).maybeSingle();
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    if (profileRow?.stripe_account_id) {
      return NextResponse.json({ accountId: profileRow.stripe_account_id });
    }

    // Get KYC data from request body
    const body = await req.json().catch(() => ({}));
    const { business_type, individual, company, tos_acceptance, external_account } = body;

    // Create account with KYC data - only include defined values
    const accountData: Record<string, unknown> = {
      type: 'custom',
      country: 'BE',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
    };

    // Add email: prefer provided email in body, otherwise use user's email
    if (body.email) accountData.email = body.email;
    else if (user.email) accountData.email = user.email;

    // Add business profile if provided (product_description / mcc)
    if (body.business_profile && Object.keys(body.business_profile).length > 0) {
      accountData.business_profile = body.business_profile;
    }

    // Only add defined KYC data
    if (business_type) accountData.business_type = business_type;
    if (individual && Object.keys(individual).length > 0) accountData.individual = individual;
    if (company && Object.keys(company).length > 0) accountData.company = company;
    if (tos_acceptance && Object.keys(tos_acceptance).length > 0) accountData.tos_acceptance = tos_acceptance;

    console.log('Creating Stripe account with data:', JSON.stringify(accountData, null, 2));
    const acct = await stripe.accounts.create(accountData);
    console.log('Stripe account created successfully:', acct.id);

    // Note: External account will be added later via separate API call
    // If client provided a bank token, attach it now to the newly created account
    // Accept payload.external_account = { token: 'btok_...' }
    if (external_account && typeof external_account === 'object') {
      const ext = external_account as Record<string, unknown>;
      const token = typeof ext.token === 'string' ? ext.token : undefined;
      if (token) {
        try {
          const accounts = stripe.accounts as Stripe.AccountsResource;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const added = await (accounts as any).createExternalAccount(acct.id, { external_account: token });
          const addedAny = added as unknown as Record<string, unknown> | null;
          console.log('Attached external account token to connected account:', addedAny?.id ?? JSON.stringify(addedAny));
        } catch (attachErr) {
          console.warn('Failed attaching external account token during onboarding:', attachErr);
        }
      } else {
      console.log('External account data received, will be added later:', JSON.stringify(external_account, null, 2));
      }
    }

    // Persist account id to profiles
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ stripe_account_id: acct.id })
      .eq('id', user.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ accountId: acct.id });
  } catch (e) {
    console.error('stripe/custom/onboard error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'onboard_failed', details: errorMessage }, { status: 500 });
  }
}
