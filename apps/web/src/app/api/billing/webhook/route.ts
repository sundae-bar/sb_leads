import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, planIdFromStripePriceId, type PlanId } from '@scoop/types';

// Stripe webhooks need the raw request body for signature verification, and
// the Node SDK needs the Node runtime (Edge breaks `crypto`).
export const runtime = 'nodejs';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: insert event_id; if already present (unique violation), skip.
  const { error: dedupErr } = await admin
    .from('processed_stripe_events')
    .insert({ event_id: event.id, event_type: event.type });
  if (dedupErr) {
    if (dedupErr.code === '23505') return NextResponse.json({ ok: true, replay: true });
    console.error('[stripe-webhook] dedup insert failed:', dedupErr);
    return NextResponse.json({ error: dedupErr.message }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, admin);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, admin);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, admin);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, admin);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, admin);
        break;
      default:
        // Acknowledge and move on. Rich event coverage isn't the starter's job.
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] error handling ${event.type}:`, err);
    // Roll back the dedup insert so Stripe retries deliver another attempt.
    await admin.from('processed_stripe_events').delete().eq('event_id', event.id);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

function tenantIdFromMetadata(meta: Stripe.Metadata | null | undefined): string | null {
  return (meta?.tenant_id as string | undefined) ?? null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, admin: AdminClient) {
  const tenantId = (session.client_reference_id as string | null) ?? null;
  if (!tenantId) {
    console.warn('[stripe-webhook] checkout.session.completed without client_reference_id');
    return;
  }

  // Fetch the subscription to get the price → plan mapping.
  if (!session.subscription) return;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const planId = priceId ? planIdFromStripePriceId(priceId) : null;
  if (!planId) {
    console.warn('[stripe-webhook] could not map price', priceId, 'to a plan');
    return;
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

  await admin
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cycle_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
      cycle_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      // Credits are granted on invoice.payment_succeeded (which fires alongside).
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: AdminClient) {
  // We need the tenant. Resolve via the subscription's metadata or via stripe_customer_id.
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const tenantId = tenantIdFromMetadata(subscription.metadata);
  if (!tenantId) {
    console.warn('[stripe-webhook] invoice.payment_succeeded — no tenant_id metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const planId: PlanId = priceId ? (planIdFromStripePriceId(priceId) ?? 'free') : 'free';

  await admin
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: subscription.status,
      credits_remaining: PLANS[planId].creditsPerCycle,
      cycle_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
      cycle_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice, admin: AdminClient) {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const tenantId = tenantIdFromMetadata(subscription.metadata);
  if (!tenantId) return;

  await admin
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, admin: AdminClient) {
  const tenantId = tenantIdFromMetadata(subscription.metadata);
  if (!tenantId) return;

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const planId: PlanId = priceId ? (planIdFromStripePriceId(priceId) ?? 'free') : 'free';

  await admin
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cycle_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
      cycle_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, admin: AdminClient) {
  const tenantId = tenantIdFromMetadata(subscription.metadata);
  if (!tenantId) return;

  await admin
    .from('subscriptions')
    .update({
      plan_id: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      credits_remaining: PLANS.free.creditsPerCycle,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
}
