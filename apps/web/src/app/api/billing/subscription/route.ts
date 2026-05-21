import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getTenantCredits } from '@/lib/billing';
import { PLANS, type PlanId } from '@scoop/types';

/**
 * GET /api/billing/subscription
 *
 * Renamed-but-unchanged-path. Returns the credit ledger snapshot for the
 * caller's active tenant plus (if grandfathered) legacy plan info. Kept at
 * the same path so existing hooks (`useSubscription()`) keep working — the
 * response shape gains `balance` + `recent` + `legacyPlan`, and preserves
 * `creditsRemaining` as an alias for `balance` so older UI bits don't break.
 */
export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const credits = await getTenantCredits(supabase, user.tenantId);

  // Resolve the public plan config for the legacy-plan UI hint.
  const legacyPlanConfig = credits.legacyPlan
    ? (PLANS[credits.legacyPlan.planId] ?? PLANS.free)
    : PLANS.free;
  const planId: PlanId = credits.legacyPlan?.planId ?? 'free';

  return NextResponse.json({
    // New shape
    balance: credits.balance,
    recent: credits.recent,
    legacyPlan: credits.legacyPlan,
    // Legacy aliases — older hooks/components read these. Safe to drop once
    // every reader has been migrated to `balance`.
    creditsRemaining: credits.balance,
    planId,
    plan: legacyPlanConfig,
    status: credits.legacyPlan?.status ?? 'active',
    cycleEndsAt: credits.legacyPlan?.cycleEndsAt ?? null,
    cancelAtPeriodEnd: false,
    autoRebillEnabled: false,
  });
}
