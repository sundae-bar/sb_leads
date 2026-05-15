import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { stripe } from '@/lib/billing/stripe';
import { ensureStripeCustomer } from '@/lib/billing';
import { PLANS, type PlanId } from '@scoop/types';

export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.tenantRole === 'member') {
    return NextResponse.json({ error: 'Only owners and admins can manage billing' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const planId = body.planId as PlanId | undefined;
  if (!planId || !(planId in PLANS) || planId === 'free') {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan.stripePriceId) {
    return NextResponse.json(
      { error: `Plan ${planId} has no Stripe price ID configured` },
      { status: 400 },
    );
  }

  const customerId = await ensureStripeCustomer(user.tenantId, user.email);
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3002';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.tenantId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: {
      metadata: { tenant_id: user.tenantId },
      ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
    },
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${webUrl}/settings/billing?checkout=success`,
    cancel_url: `${webUrl}/settings/billing?checkout=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
