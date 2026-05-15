// API-side credit consumption — used by the chat route to gate agent runs.
// Mirrors apps/web/src/lib/billing/index.ts (kept thin to avoid web→api imports).
import { adminDb } from '../db/admin.js';
import { stripe } from './stripe.js';
import { PLANS, type PlanId } from '@scoop/types';

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'rebill_triggered' | 'rebill_failed' | 'no_payment_method' | 'throttled' };

interface SubRow {
  plan_id: PlanId;
  status: string;
  credits_remaining: number;
  stripe_subscription_id: string | null;
  auto_rebill_enabled: boolean;
  last_rebill_at: string | null;
}

export async function consumeCredits(
  tenantId: string,
  amount: number,
): Promise<ConsumeResult> {
  const { data: ok } = await adminDb.rpc('consume_credits', {
    p_tenant_id: tenantId,
    p_amount: amount,
  });
  if (ok === true) {
    const { data: sub } = await adminDb
      .from('subscriptions')
      .select('credits_remaining')
      .eq('tenant_id', tenantId)
      .single();
    return { ok: true, remaining: (sub?.credits_remaining as number) ?? 0 };
  }

  const { data: sub } = await adminDb
    .from('subscriptions')
    .select('plan_id, status, credits_remaining, stripe_subscription_id, auto_rebill_enabled, last_rebill_at')
    .eq('tenant_id', tenantId)
    .single<SubRow>();
  if (!sub) return { ok: false, reason: 'no_payment_method' };

  if (!sub.stripe_subscription_id || sub.plan_id === 'free') {
    return { ok: false, reason: 'no_payment_method' };
  }
  if (!sub.auto_rebill_enabled) return { ok: false, reason: 'rebill_failed' };

  const minInterval = PLANS[sub.plan_id]?.minRebillIntervalSeconds ?? 600;
  if (
    sub.last_rebill_at &&
    Date.now() - new Date(sub.last_rebill_at).getTime() < minInterval * 1000
  ) {
    return { ok: false, reason: 'throttled' };
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
    });
    await adminDb
      .from('subscriptions')
      .update({ last_rebill_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);
    return { ok: false, reason: 'rebill_triggered' };
  } catch {
    return { ok: false, reason: 'rebill_failed' };
  }
}

/**
 * Refund credits to a tenant — used when a previously-consumed credit didn't
 * yield a result (e.g. find-email returned no emails). Returns the new balance.
 */
export async function refundCredits(
  tenantId: string,
  amount: number,
): Promise<{ remaining: number }> {
  const { data: current } = await adminDb
    .from('subscriptions')
    .select('credits_remaining')
    .eq('tenant_id', tenantId)
    .single();
  const next = ((current?.credits_remaining as number | undefined) ?? 0) + amount;
  await adminDb
    .from('subscriptions')
    .update({ credits_remaining: next })
    .eq('tenant_id', tenantId);
  return { remaining: next };
}

/** Read current credits without consuming. */
export async function getCreditsRemaining(tenantId: string): Promise<number> {
  const { data } = await adminDb
    .from('subscriptions')
    .select('credits_remaining')
    .eq('tenant_id', tenantId)
    .single();
  return (data?.credits_remaining as number | undefined) ?? 0;
}
