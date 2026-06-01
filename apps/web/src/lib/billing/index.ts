import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PLANS,
  consumeCreditsArgs,
  refundLedgerRow,
  toCreditLedgerEntry,
  type ConsumeCreditsOptions,
  type ConsumeCreditsResult,
  type CreditLedgerRow,
  type Feature,
  type PlanConfig,
  type PlanId,
  type RedeemCouponResult,
  type TenantCreditsResponse,
} from '@scoop/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from './stripe';

// ─── Legacy subscriptions ────────────────────────────────────────────────────
// Subscriptions still exist for grandfathered customers; the webhook keeps
// honouring invoice.payment_succeeded for them. No new subscriptions are
// created. New tenants are credit-pack only — see consumeCredits / topup.

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
  const { data } = await supabase.from('subscriptions').select('*').maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

export async function getCurrentPlan(supabase: SupabaseClient): Promise<PlanConfig> {
  const sub = await getSubscription(supabase);
  if (!sub) return PLANS.free;
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

// ─── Credit consumption (new ledger-backed path) ─────────────────────────────
// Contracts (RPC args, refund row, option/result types, ledger mapping) come
// from @scoop/types so this stays in lockstep with the apps/api counterpart.

export type ConsumeOptions = ConsumeCreditsOptions;
export type ConsumeResult = ConsumeCreditsResult;

/**
 * Atomically debit credits via the consume_credits RPC. Inserts a debit row
 * in `credit_ledger`; the trigger updates `tenant_credits.balance` under a
 * row lock. No more auto-rebill — top-ups are explicit user actions now.
 */
export async function consumeCredits(
  tenantId: string,
  amount: number,
  opts: ConsumeOptions = {},
): Promise<ConsumeResult> {
  const admin = createAdminClient();
  const { data: ok } = await admin.rpc('consume_credits', consumeCreditsArgs(tenantId, amount, opts));
  if (ok !== true) return { ok: false, reason: 'out_of_credits' };
  const remaining = await getCreditsRemaining(tenantId);
  return { ok: true, remaining };
}

export async function refundCredits(
  tenantId: string,
  amount: number,
  opts: { description?: string; refType?: string; refId?: string } = {},
): Promise<{ remaining: number }> {
  const admin = createAdminClient();
  await admin.from('credit_ledger').insert(refundLedgerRow(tenantId, amount, opts));
  const remaining = await getCreditsRemaining(tenantId);
  return { remaining };
}

export async function getCreditsRemaining(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('tenant_credits')
    .select('balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

/**
 * User-scoped view of the tenant's credit balance + recent activity. Reads
 * through the user's supabase client so RLS naturally scopes the data to
 * the active tenant.
 */
export async function getTenantCredits(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 50,
): Promise<TenantCreditsResponse> {
  const [{ data: balanceRow }, { data: rows }, { data: sub }] = await Promise.all([
    supabase.from('tenant_credits').select('balance').eq('tenant_id', tenantId).maybeSingle(),
    supabase
      .from('credit_ledger')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('subscriptions')
      .select('plan_id, status, cycle_ends_at')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);
  const balance = (balanceRow?.balance as number | undefined) ?? 0;
  const recent = ((rows ?? []) as CreditLedgerRow[]).map(toCreditLedgerEntry);
  const legacyPlan = sub
    ? {
        planId: sub.plan_id as PlanId,
        status: sub.status as string,
        cycleEndsAt: (sub.cycle_ends_at as string | null) ?? null,
      }
    : undefined;
  return { balance, recent, legacyPlan };
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

/**
 * Redeem a coupon code for the caller's active tenant. Calls the SECURITY
 * DEFINER RPC `redeem_coupon`; everything (auth check, expiry, dedup, ledger
 * insert) is atomic inside Postgres. Caller must pass the USER-SCOPED
 * supabase client so auth.uid() + get_active_tenant_id() resolve correctly.
 */
export async function redeemCoupon(
  supabase: SupabaseClient,
  code: string,
): Promise<RedeemCouponResult> {
  const { data, error } = await supabase.rpc('redeem_coupon', { p_code: code });
  if (error) return { ok: false, error: 'invalid_code' };
  return data as RedeemCouponResult;
}

// ─── Stripe Customer helper (used by legacy + new top-up routes) ─────────────

export async function ensureStripeCustomer(
  tenantId: string,
  email: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { tenant_id: tenantId },
  });
  // No subscription row yet (new credit-only tenant) → upsert one so we
  // have somewhere to stash the customer ID. The row stays at plan=free
  // and is mostly inert; only the legacy webhook path touches it.
  await admin
    .from('subscriptions')
    .upsert(
      { tenant_id: tenantId, stripe_customer_id: customer.id, plan_id: 'free' },
      { onConflict: 'tenant_id' },
    );
  return customer.id;
}
