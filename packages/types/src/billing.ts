// Billing plans + credit metering. Shared between web and api so they agree on
// what 1 credit means and how to throttle auto-rebills.
//
// To add a plan:
//   1. Create a recurring price in Stripe Dashboard (test + live).
//   2. Add an entry below + a STRIPE_PRICE_<NAME> env var.
//   3. Reference the env var in the entry's `stripePriceId`.
//
// Note on env access: `process.env.STRIPE_PRICE_*` resolves on the server.
// Client-side imports see `null` for these — that's intentional. Only the
// server-side checkout/webhook routes need real price IDs.

export type PlanId = 'free' | 'growth' | 'business';
export type Feature =
  | 'api_keys'
  | 'team_unlimited';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  /** Display only — Stripe is source of truth for the actual charge. */
  priceMonthlyUsd: number;
  /** Annual billing price per month (display only). */
  priceAnnualUsd: number;
  /** Stripe Price ID for monthly billing. `null` = free tier. */
  stripePriceId: string | null;
  /** Stripe Price ID for annual billing. `null` = free tier or not yet set. */
  stripePriceIdAnnual: string | null;
  /** Credits granted on each charge / cycle reset. */
  creditsPerCycle: number;
  features: readonly Feature[];
  limits?: { teamMembers?: number };
  /** Trigger auto-rebill at this credit level (default 0). */
  rebillThreshold?: number;
  /** Anti-abuse: minimum seconds between auto-rebills (default 600). */
  minRebillIntervalSeconds?: number;
  /** Days of free trial granted on first Checkout. Omit to disable trials. */
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
    creditsPerCycle: 10,
    features: ['api_keys', 'team_unlimited'],
    limits: { teamMembers: 1 },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'For growing teams',
    priceMonthlyUsd: 49,
    priceAnnualUsd: 39,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? null,
    creditsPerCycle: 4000,
    features: ['api_keys', 'team_unlimited'],
    minRebillIntervalSeconds: 600,
    trialDays: 14,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For large teams',
    priceMonthlyUsd: 299,
    priceAnnualUsd: 249,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? null,
    creditsPerCycle: 30000,
    features: ['api_keys', 'team_unlimited'],
    minRebillIntervalSeconds: 600,
  },
};

export const PAID_PLAN_IDS: PlanId[] = ['growth', 'business'];

/**
 * Pluggable per-call meter. Returns the number of credits to deduct for one
 * agent run. Default: 1 credit per run.
 *
 *   - Token-based: return Math.ceil((run.totalTokens ?? 0) / 1000);
 *   - Cost-based:  return Math.ceil(modelCostCents(run) * 10);
 *
 * If you switch to a metric known only *after* the run (tokens, cost), move
 * the consumeCredits call to the post-run path in apps/api/src/routes/chat.ts.
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
