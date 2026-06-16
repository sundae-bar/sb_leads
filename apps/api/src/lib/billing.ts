// API-side credit operations — used by the chat route + provider tools to
// gate paid work, and by the webhook handler to credit incoming payments.
// Backed by the credit_ledger / tenant_credits tables introduced in 0016.
//
// The credit *contracts* (consume_credits RPC args, refund row shape, ledger
// mapping, option/result types) live in @scoop/types so this module and its
// apps/web counterpart can't drift on the parts that move money. What stays
// here is the thin wrapper that binds those contracts to the admin client.
import { adminDb } from '../db/admin.js';
import {
  consumeCreditsArgs,
  refundLedgerRow,
  toCreditLedgerEntry,
  type ConsumeCreditsOptions,
  type ConsumeCreditsResult,
  type CreditLedgerRow,
  type PlanId,
  type RedeemCouponResult,
  type TenantCreditsResponse,
} from '@scoop/types';

export type ConsumeOptions = ConsumeCreditsOptions;
export type ConsumeResult = ConsumeCreditsResult;

/**
 * Atomically debit `amount` credits from `tenantId`. Inserts a debit row in
 * `credit_ledger`; the apply trigger updates `tenant_credits.balance` under
 * the same row lock the RPC holds, so concurrent debits cannot oversell.
 *
 * Returns `{ ok: false, reason: 'out_of_credits' }` when balance < amount.
 */
export async function consumeCredits(
  tenantId: string,
  amount: number,
  opts: ConsumeCreditsOptions = {},
): Promise<ConsumeCreditsResult> {
  const { data: ok } = await adminDb.rpc('consume_credits', consumeCreditsArgs(tenantId, amount, opts));
  if (ok !== true) return { ok: false, reason: 'out_of_credits' };
  const remaining = await getCreditsRemaining(tenantId);
  return { ok: true, remaining };
}

/**
 * Credit `amount` back to the tenant — used when a previously-consumed
 * credit didn't yield a result (find_email returned no emails) and the
 * caller wants to undo it. Inserts a positive ledger entry with kind=refund.
 */
export async function refundCredits(
  tenantId: string,
  amount: number,
  opts: Pick<ConsumeCreditsOptions, 'description' | 'refType' | 'refId'> = {},
): Promise<{ remaining: number }> {
  await adminDb.from('credit_ledger').insert(refundLedgerRow(tenantId, amount, opts));
  const remaining = await getCreditsRemaining(tenantId);
  return { remaining };
}

/** Read current balance from the materialised view. O(1). */
export async function getCreditsRemaining(tenantId: string): Promise<number> {
  const { data } = await adminDb
    .from('tenant_credits')
    .select('balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

/**
 * Bundle balance + recent ledger entries for the /api/billing/subscription
 * endpoint and any other "show me where I'm at" surface. `limit` defaults to
 * 50 — enough for the activity table on the billing page without paginating.
 */
export async function getTenantCredits(
  tenantId: string,
  limit = 50,
): Promise<TenantCreditsResponse> {
  const [balance, { data: rows }] = await Promise.all([
    getCreditsRemaining(tenantId),
    adminDb
      .from('credit_ledger')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);
  const recent = ((rows ?? []) as CreditLedgerRow[]).map(toCreditLedgerEntry);

  // If the tenant has a legacy subscriptions row, surface a slimmed-down
  // view of it so the UI can show "you're on the Growth plan, expires X".
  const { data: sub } = await adminDb
    .from('subscriptions')
    .select('plan_id, status, cycle_ends_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  const legacyPlan = sub
    ? {
        planId: sub.plan_id as PlanId,
        status: sub.status as string,
        cycleEndsAt: (sub.cycle_ends_at as string | null) ?? null,
      }
    : undefined;

  return { balance, recent, legacyPlan };
}

/**
 * Redeem a coupon code for the caller's active tenant. Delegates to the
 * SECURITY DEFINER RPC `redeem_coupon` — that's where the validation +
 * atomic insert lives. Caller must be authenticated and have an active
 * tenant; both are inferred from the JWT inside the RPC.
 *
 * IMPORTANT: caller must use a user-scoped supabase client (not adminDb)
 * so `auth.uid()` and `get_active_tenant_id()` resolve inside the RPC.
 */
export async function redeemCoupon(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  code: string,
): Promise<RedeemCouponResult> {
  const { data, error } = await supabase.rpc('redeem_coupon', { p_code: code });
  if (error) {
    return { ok: false, error: 'invalid_code' };
  }
  return data as RedeemCouponResult;
}
