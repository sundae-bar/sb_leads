import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { stripe } from '@/lib/billing/stripe';
import { ensureStripeCustomer } from '@/lib/billing';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CREDITS_PER_USD,
  TOPUP_PRESETS_USD,
  type TopupPresetUsd,
  usdToCredits,
} from '@scoop/types';

/**
 * One-time Stripe Checkout for buying a credit pack. Distinct from the
 * legacy `/api/billing/checkout` route (which sets up monthly
 * subscriptions). This route creates a `mode: 'payment'` session priced
 * inline so we don't need to maintain predefined Stripe products for each
 * preset.
 *
 * The webhook handler watches for `checkout.session.completed` where
 * `mode === 'payment'` and writes a `credit_ledger` row with kind=`topup`.
 * Idempotency comes from the `stripe_topup_sessions.session_id` PK we
 * insert here in pending state.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Top-ups are tenant-wide; any member can buy. We could gate this to
  // owner/admin later if billing surface gets sensitive; for now anyone
  // who can already incur credit costs by using the tools can top up.

  const body = await request.json().catch(() => ({}));
  const amountUsd = body.amountUsd as number | undefined;

  // Reject anything not in our preset list. This protects the Stripe
  // session from arbitrary amounts (avoids weird $0.01 charges, exposes a
  // clean set of values, and matches what the UI offers).
  if (
    typeof amountUsd !== 'number' ||
    !TOPUP_PRESETS_USD.includes(amountUsd as TopupPresetUsd)
  ) {
    return NextResponse.json(
      { error: `amountUsd must be one of ${TOPUP_PRESETS_USD.join(', ')}` },
      { status: 400 },
    );
  }

  const credits = usdToCredits(amountUsd);
  const customerId = await ensureStripeCustomer(user.tenantId, user.email);
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3002';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: user.tenantId,
    // Inline price_data — no predefined Stripe product needed for each preset.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountUsd * 100, // dollars → cents
          product_data: {
            name: `${credits.toLocaleString()} scoop credits`,
            description: `One-time top-up. 1 credit = $${(1 / CREDITS_PER_USD).toFixed(2)}.`,
          },
        },
      },
    ],
    // Metadata travels through Stripe and back via the webhook. Reconstruct
    // the topup session even if the pending DB row is missing (race).
    payment_intent_data: {
      metadata: {
        tenant_id: user.tenantId,
        user_id: user.id,
        credits: String(credits),
        amount_usd_cents: String(amountUsd * 100),
      },
    },
    metadata: {
      tenant_id: user.tenantId,
      user_id: user.id,
      credits: String(credits),
      amount_usd_cents: String(amountUsd * 100),
      kind: 'topup',
    },
    automatic_tax: { enabled: true },
    success_url: `${webUrl}/app/settings/billing?topup=success`,
    cancel_url: `${webUrl}/app/settings/billing?topup=cancel`,
  });

  // Insert pending row for idempotency. The webhook either updates this row
  // to `completed` or reconstructs it from metadata if it arrives first.
  const admin = createAdminClient();
  await admin.from('stripe_topup_sessions').insert({
    session_id: session.id,
    tenant_id: user.tenantId,
    amount_usd_cents: amountUsd * 100,
    credits,
    status: 'pending',
    initiated_by: user.id,
  });

  return NextResponse.json({ url: session.url, session_id: session.id });
}
