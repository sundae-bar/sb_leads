import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PLANS,
  type Feature,
  type PlanId,
  type PlanConfig,
} from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from './stripe';

export interface SubscriptionRow {
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: PlanId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  credits_remaining: number;
  cycle_started_at: string;
  cycle_ends_at: string | null;
  cancel_at_period_end: boolean;
  auto_rebill_enabled: boolean;
  last_rebill_at: string | null;
}

export async function getSubscription(supabase: SupabaseClient): Promise<SubscriptionRow | null> {
  const { data } = await supabase.from('subscriptions').select('*').single();
  return (data as SubscriptionRow | null) ?? null;
}

export async function getCurrentPlan(supabase: SupabaseClient): Promise<PlanConfig> {
  const sub = await getSubscription(supabase);
  if (!sub) return PLANS.free;
  // Downgrade to free if billing is broken — RLS already scopes to tenant.
  if (sub.status === 'canceled' || sub.status === 'past_due') return PLANS.free;
  return PLANS[sub.plan_id] ?? PLANS.free;
}

export async function hasFeature(
  supabase: SupabaseClient,
  feature: Feature,
): Promise<boolean> {
  const plan = await getCurrentPlan(supabase);
  return plan.features.includes(feature);
}

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'rebill_triggered' | 'rebill_failed' | 'no_payment_method' | 'throttled' };

/**
 * Server-side credit consumption. Race-safe via the consume_credits SQL function.
 * On insufficient credits, attempts an auto-rebill (if enabled and not throttled).
 *
 * Uses adminDb because credit consumption is a privileged operation that runs
 * outside any user request (e.g. background agents) and triggering Stripe
 * requires server credentials.
 */
export async function consumeCredits(
  tenantId: string,
  amount: number,
): Promise<ConsumeResult> {
  const admin = createAdminClient();

  // 1. Atomic decrement.
  const { data: ok } = await admin.rpc('consume_credits', {
    p_tenant_id: tenantId,
    p_amount: amount,
  });
  if (ok === true) {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('credits_remaining')
      .eq('tenant_id', tenantId)
      .single();
    return { ok: true, remaining: (sub?.credits_remaining as number) ?? 0 };
  }

  // 2. Insufficient. Look up the row to decide whether to rebill.
  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single<SubscriptionRow>();
  if (!sub) return { ok: false, reason: 'no_payment_method' };

  // Free tier or no Stripe subscription → can't rebill.
  if (!sub.stripe_subscription_id || sub.plan_id === 'free') {
    return { ok: false, reason: 'no_payment_method' };
  }
  if (!sub.auto_rebill_enabled) {
    return { ok: false, reason: 'rebill_failed' };
  }

  // 3. Throttle.
  const minInterval = PLANS[sub.plan_id].minRebillIntervalSeconds ?? 600;
  if (
    sub.last_rebill_at &&
    Date.now() - new Date(sub.last_rebill_at).getTime() < minInterval * 1000
  ) {
    return { ok: false, reason: 'throttled' };
  }

  // 4. Trigger Stripe to invoice now. Webhook will replenish credits on success.
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
    });
    await admin
      .from('subscriptions')
      .update({ last_rebill_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);
    // Credits aren't replenished yet — webhook does that. Caller should retry shortly.
    return { ok: false, reason: 'rebill_triggered' };
  } catch {
    return { ok: false, reason: 'rebill_failed' };
  }
}

/** Get-or-create a Stripe Customer for a tenant. Lazy. */
export async function ensureStripeCustomer(
  tenantId: string,
  email: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .single();
  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { tenant_id: tenantId },
  });
  await admin
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('tenant_id', tenantId);
  return customer.id;
}
