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
  // Two flavours of completed checkout:
  //   - mode='payment'      → one-time credit top-up. Credit the ledger now.
  //   - mode='subscription' → legacy monthly subscription. Sync plan info;
  //     credits land on invoice.payment_succeeded which fires alongside.
  if (session.mode === 'payment') {
    await handleTopupCompleted(session, admin);
    return;
  }

  const tenantId = (session.client_reference_id as string | null) ?? null;
  if (!tenantId) {
    console.warn('[stripe-webhook] checkout.session.completed without client_reference_id');
    return;
  }

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
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
}

/**
 * Credit a one-time top-up payment. Idempotent: the stripe_topup_sessions
 * row (PK = session_id) acts as the dedup record. If the row exists with
 * status='completed' we short-circuit; if it's missing entirely (webhook
 * raced our pending-row INSERT) we reconstruct it from session metadata.
 *
 * Once the ledger row is inserted, the apply_ledger_to_tenant_credits
 * trigger updates tenant_credits.balance in lockstep.
 */
async function handleTopupCompleted(session: Stripe.Checkout.Session, admin: AdminClient) {
  if (session.payment_status !== 'paid') {
    console.warn('[stripe-webhook] topup checkout completed but not paid:', session.id);
    return;
  }

  const meta = session.metadata ?? {};
  const tenantId =
    (session.client_reference_id as string | null) ?? (meta.tenant_id as string | undefined) ?? null;
  const credits = meta.credits ? parseInt(meta.credits as string, 10) : NaN;
  const amountUsdCents = meta.amount_usd_cents
    ? parseInt(meta.amount_usd_cents as string, 10)
    : (session.amount_total ?? 0);
  if (!tenantId || !Number.isFinite(credits) || credits <= 0) {
    console.warn('[stripe-webhook] topup missing tenant_id or credits metadata:', session.id);
    return;
  }

  // Check if we've already credited this session. PK on session_id makes
  // this O(1). Either the row exists from the pending insert (normal path)
  // or it's missing (webhook raced the INSERT — reconstruct from metadata).
  const { data: existing } = await admin
    .from('stripe_topup_sessions')
    .select('status, ledger_entry_id')
    .eq('session_id', session.id)
    .maybeSingle();
  if (existing?.status === 'completed') {
    console.info('[stripe-webhook] topup already credited:', session.id);
    return;
  }

  // Insert the ledger entry. The trigger applies it to tenant_credits.
  // ref_id = session_id so we can trace any topup back to its Stripe txn.
  const { data: entry, error: ledgerErr } = await admin
    .from('credit_ledger')
    .insert({
      tenant_id: tenantId,
      amount: credits,
      kind: 'topup',
      description: `Stripe top-up · ${(amountUsdCents / 100).toFixed(2)} USD`,
      ref_type: 'stripe_session',
      ref_id: session.id,
      actor_id: (meta.user_id as string | undefined) ?? null,
    })
    .select('id')
    .single();
  if (ledgerErr) {
    console.error('[stripe-webhook] topup ledger insert failed:', ledgerErr);
    throw new Error(`ledger insert failed: ${ledgerErr.message}`);
  }

  // Upsert the session row to completed. Upsert (not just update) so the
  // race-with-checkout-insert path still produces a row to reference.
  await admin.from('stripe_topup_sessions').upsert(
    {
      session_id: session.id,
      tenant_id: tenantId,
      amount_usd_cents: amountUsdCents,
      credits,
      status: 'completed',
      ledger_entry_id: entry.id,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' },
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: AdminClient) {
  // Legacy path: grandfathered tenants on monthly subscriptions get a fresh
  // creditsPerCycle grant via a ledger entry (kind='grant'). Subscription
  // metadata still tracks plan/status — but credits live in the ledger now,
  // not subscriptions.credits_remaining.
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

  // Insert the ledger grant. ref_id = invoice.id so we can dedup if Stripe
  // ever fires the same invoice twice (shouldn't happen — processed_stripe_events
  // catches it earlier — but the unique-ish ref protects against admin
  // replays via the Stripe CLI).
  await admin.from('credit_ledger').insert({
    tenant_id: tenantId,
    amount: PLANS[planId].creditsPerCycle,
    kind: 'grant',
    description: `Subscription invoice (${planId})`,
    ref_type: 'stripe_invoice',
    ref_id: invoice.id,
  });

  // Sync legacy plan info (kept for the "you're on the Growth plan" UI hint).
  await admin
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: subscription.status,
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

  // Subscription cancelled — drop the plan back to free. We do NOT zero
  // out the credit balance; existing credits in the ledger stay, the user
  // just stops receiving monthly grants going forward.
  await admin
    .from('subscriptions')
    .update({
      plan_id: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);
}
