import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { supabaseServiceRole } from '@/lib/supabaseServiceRole';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });

    const supabase = supabaseServiceRole();
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '') || null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token as string).catch(() => ({ data: { user: null }, error: { message: 'auth_failed' } }));
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
    // Expect body to contain fields to update per Stripe API shape, e.g. business_type, individual, business_profile, tos_acceptance, external_account
    const { data: profileRow, error: profErr } = await supabase.from('profiles').select('stripe_account_id').eq('id', user.id).maybeSingle();
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    const accountId = profileRow?.stripe_account_id;
    if (!accountId) return NextResponse.json({ error: 'No connected account' }, { status: 400 });

    // Add tos_acceptance server-side if missing. Stripe requires a timestamp and ip when accepting tos.
    if (!body.tos_acceptance) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      body.tos_acceptance = {
        date: Math.floor(Date.now() / 1000),
        ip: Array.isArray(ip) ? ip[0] : ip,
      };
    }

    console.log('Updating Stripe account', accountId, 'with payload:', JSON.stringify(body, null, 2));

    // Validate file IDs if present
    const validateFileId = async (fileId: string) => {
      try {
        await stripe.files.retrieve(fileId);
        return true;
      } catch (e) {
        console.error(`Invalid file ID: ${fileId}`, e);
        return false;
      }
    };

    // Check file IDs in the payload
    const checkFiles = async (obj: unknown): Promise<void> => {
      if (typeof obj === 'object' && obj !== null) {
        for (const key of Object.keys(obj)) {
          if (key === 'document' || key === 'additional_document') {
            const value = (obj as Record<string, unknown>)[key];
            if (value && typeof value === 'string') {
              const isValid = await validateFileId(value);
              if (!isValid) {
                throw new Error(`Invalid file ID: ${value}`);
              }
            }
          } else {
            const value = (obj as Record<string, unknown>)[key];
            if (typeof value === 'object') {
              await checkFiles(value);
            }
          }
        }
      }
    };

    await checkFiles(body);

    // Update the Stripe account fields
    const update = await stripe.accounts.update(accountId, body);

    return NextResponse.json({ account: update });
  } catch (e) {
    console.error('stripe/custom/account error', e);
    // Return more detailed error information
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'update_failed', 
      details: errorMessage,
      type: e instanceof Error ? e.constructor.name : typeof e 
    }, { status: 500 });
  }
}
