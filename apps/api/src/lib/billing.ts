// API-side credit operations — used by the chat route + provider tools to
// gate paid work, and by the webhook handler to credit incoming payments.
// Backed by the credit_ledger / tenant_credits tables introduced in 0016.
// Mirrors apps/web/src/lib/billing/index.ts (kept thin to avoid cross-imports).
import { adminDb } from '../db/admin.js';
import type {
  CreditEntryKind,
  CreditLedgerEntry,
  RedeemCouponResult,
  TenantCreditsResponse,
} from '@scoop/types';

interface ConsumeOptions {
  /** One of credit_entry_kind PG enum. Defaults to `debit_find`. */
  kind?: CreditEntryKind;
  /** Free-form human description ("find_email Cykel"). */
  description?: string;
  /** Categorical ref (e.g. 'find_email_request', 'verify_email'). */
  refType?: string;
  /** ID under refType (e.g. the request UUID). */
  refId?: string;
}

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'out_of_credits' };

/**
 * Atomically debit `amount` credits from `tenantId`. Inserts a debit row in
 * `credit_ledger`; the apply trigger updates `tenant_credits.balance` under
 * the same row lock the RPC holds, so concurrent debits cannot oversell.
 *
 * Returns `{ ok: false, reason: 'out_of_credits' }` when balance < amount.
 * The old auto-rebill path is gone — top-ups are now explicit user actions.
 */
export async function consumeCredits(
  tenantId: string,
  amount: number,
  opts: ConsumeOptions = {},
): Promise<ConsumeResult> {
  const { data: ok } = await adminDb.rpc('consume_credits', {
    p_tenant_id: tenantId,
    p_amount: amount,
    p_kind: opts.kind ?? 'debit_find',
    p_description: opts.description ?? null,
    p_ref_type: opts.refType ?? null,
    p_ref_id: opts.refId ?? null,
  });
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
  opts: { description?: string; refType?: string; refId?: string } = {},
): Promise<{ remaining: number }> {
  await adminDb.from('credit_ledger').insert({
    tenant_id: tenantId,
    amount,
    kind: 'refund',
    description: opts.description ?? null,
    ref_type: opts.refType ?? null,
    ref_id: opts.refId ?? null,
  });
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

interface LedgerRow {
  id: number;
  tenant_id: string;
  amount: number;
  kind: CreditEntryKind;
  description: string | null;
  ref_type: string | null;
  ref_id: string | null;
  actor_id: string | null;
  metadata: unknown;
  created_at: string;
}

function toLedgerEntry(row: LedgerRow): CreditLedgerEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    amount: row.amount,
    kind: row.kind,
    description: row.description,
    refType: row.ref_type,
    refId: row.ref_id,
    actorId: row.actor_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
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
  const recent = ((rows ?? []) as LedgerRow[]).map(toLedgerEntry);

  // If the tenant has a legacy subscriptions row, surface a slimmed-down
  // view of it so the UI can show "you're on the Growth plan, expires X".
  const { data: sub } = await adminDb
    .from('subscriptions')
    .select('plan_id, status, cycle_ends_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  const legacyPlan = sub
    ? {
        planId: sub.plan_id as TenantCreditsResponse['legacyPlan'] extends infer L
          ? L extends { planId: infer P }
            ? P
            : never
          : never,
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
