import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY in env');
  process.exit(2);
}

const stripe = new Stripe(key, { apiVersion: '2025-08-27.basil' });

(async () => {
  try {
    const acct = await stripe.accounts.create({ type: 'standard', email: 'test+onboard@example.com' });
    console.log('Created account:', acct.id);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const link = await stripe.accountLinks.create({
      account: acct.id,
      refresh_url: `${origin}/profile/stripe/refresh`,
      return_url: `${origin}/profile/stripe/return`,
      type: 'account_onboarding',
    });
    console.log('Account link URL:', link.url);
  } catch (e) {
    console.error('Stripe error', e);
    process.exit(1);
  }
})();
