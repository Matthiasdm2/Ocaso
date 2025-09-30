// Placeholder onboarding route for Stripe Connect onboarding link.
// TODO: replace with real Stripe integration using STRIPE_SECRET_KEY and server-side logic.

export async function POST() {
  try {
    // In production: create a Stripe Express account and onboarding link, then return { url }
    // For now return a mocked URL so the frontend can open it during dev/testing.
    return new Response(JSON.stringify({ url: 'https://dashboard.stripe.com/register?mock=1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'onboarding_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
