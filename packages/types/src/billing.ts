// Billing types. Credit-pack model: tenants buy one-time top-ups via Stripe
// or redeem coupon codes; debits flow through the ledger on every paid tool
// call. The legacy `subscriptions` table + plan tiers stay in the schema so
// grandfathered subscribers keep getting monthly grants (webhook still
// honours invoice.payment_succeeded), but new customers are credit-only.
//
// Conversion: 1 credit = $0.01 USD. So $10 = 1,000 credits.

// ─── Top-up presets ──────────────────────────────────────────────────────────
/**
 * Conversion rate. Used by checkout + webhook + UI labels.
 *   credits = usd * CREDITS_PER_USD
 *   1 credit = $0.01 → CREDITS_PER_USD = 100.
 */
export const CREDITS_PER_USD = 100;

/**
 * Preset top-up amounts in USD shown on the buy-credits UI. Anything not in
 * this list is rejected by /api/billing/topup/checkout to keep Stripe sessions
 * predictable and protect against weird amounts.
 */
export const TOPUP_PRESETS_USD = [10, 25, 50, 100, 250] as const;
export type TopupPresetUsd = (typeof TOPUP_PRESETS_USD)[number];

export function usdToCredits(usd: number): number {
  return Math.round(usd * CREDITS_PER_USD);
}

export function creditsToUsd(credits: number): number {
  return credits / CREDITS_PER_USD;
}

// ─── Ledger types ────────────────────────────────────────────────────────────
/**
 * Mirrors the `credit_entry_kind` PG enum from 0016_credit_ledger.sql.
 * Keep in sync with the migration.
 */
export type CreditEntryKind =
  | 'grant'
  | 'adjustment'
  | 'coupon'
  | 'topup'
  | 'refund'
  | 'debit_find'
  | 'debit_verify'
  | 'debit_intent';

export interface CreditLedgerEntry {
  id: number;
  tenantId: string;
  /** Signed: positive credits, negative debits. */
  amount: number;
  kind: CreditEntryKind;
  description: string | null;
  refType: string | null;
  refId: string | null;
  actorId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface TenantCreditsResponse {
  balance: number;
  /** Most recent N ledger entries (default 50, sorted desc). */
  recent: CreditLedgerEntry[];
  /**
   * Legacy plan info. Present iff this tenant has a row in `subscriptions`
   * (a grandfathered subscriber); absent for new credit-only tenants.
   */
  legacyPlan?: {
    planId: PlanId;
    status: string;
    cycleEndsAt: string | null;
  };
}

// ─── Coupon types ────────────────────────────────────────────────────────────
export interface Coupon {
  id: string;
  code: string;
  amount: number;
  description: string | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  expiresAt: string | null;
  enabled: boolean;
  createdAt: string;
}

/** Shape returned by the redeem_coupon RPC + /api/billing/coupons/redeem. */
export type RedeemCouponResult =
  | { ok: true; amount: number; balance: number }
  | {
      ok: false;
      error:
        | 'unauthenticated'
        | 'no_active_tenant'
        | 'invalid_code'
        | 'disabled'
        | 'expired'
        | 'exhausted'
        | 'already_redeemed';
    };

// ─── Legacy plan config (subscriptions — DO NOT advertise on new surfaces) ───
// Kept for the webhook handler which still receives invoice.payment_succeeded
// events for tenants on monthly subscriptions. The pricing landing page no
// longer shows these — credit packs only.
export type PlanId = 'free' | 'growth' | 'business';
export type Feature = 'api_keys' | 'team_unlimited';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  priceAnnualUsd: number;
  stripePriceId: string | null;
  stripePriceIdAnnual: string | null;
  /** Credits granted on each Stripe invoice for this plan. */
  creditsPerCycle: number;
  features: readonly Feature[];
  limits?: { teamMembers?: number };
  trialDays?: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try it out',
    priceMonthlyUsd: 0,
    priceAnnualUsd: 0,
    stripePriceId: null,
    stripePriceIdAnnual: null,
    creditsPerCycle: 50, // signup grant for new tenants (replaces 10)
    features: ['api_keys', 'team_unlimited'],
    limits: { teamMembers: 1 },
  },
  growth: {
    id: 'growth',
    name: 'Growth (legacy)',
    description: 'Grandfathered monthly plan — no new signups.',
    priceMonthlyUsd: 49,
    priceAnnualUsd: 39,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? null,
    creditsPerCycle: 4000,
    features: ['api_keys', 'team_unlimited'],
    trialDays: 14,
  },
  business: {
    id: 'business',
    name: 'Business (legacy)',
    description: 'Grandfathered monthly plan — no new signups.',
    priceMonthlyUsd: 299,
    priceAnnualUsd: 249,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? null,
    creditsPerCycle: 30000,
    features: ['api_keys', 'team_unlimited'],
  },
};

export const PAID_PLAN_IDS: PlanId[] = ['growth', 'business'];

/**
 * Pluggable per-call meter. Returns the number of credits to deduct for one
 * agent run. Default: 1 credit per run. See apps/api/src/providers/credits.ts
 * for the per-provider, per-action cost matrix (which is the more granular
 * version used by the find_email / verify_email / intent paths).
 */
export function meterAgentRun(_run: {
  totalTokens?: number;
  agentName?: string;
}): number {
  return 1;
}

/** Reverse-lookup: which PlanId owns a given Stripe price ID? */
export function planIdFromStripePriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) return plan.id;
  }
  return null;
}

/**
 * Signup grant — credits handed out to a new tenant on first creation.
 * Replaces the legacy "free plan with 10 credits" path. Lives here (not in
 * a migration constant) because it's a product-level decision that may
 * change quickly without a schema change.
 */
export const SIGNUP_GRANT_CREDITS = 50;
