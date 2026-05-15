import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PLANS, type PlanId } from '@scoop/types';

/** GET /api/billing/subscription — current plan + credits + status. */
export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: sub } = await supabase.from('subscriptions').select('*').single();

  if (!sub) {
    // Defensive: every tenant should have a row from create-tenant or backfill,
    // but if we hit this, surface a free-plan stub.
    return NextResponse.json({
      planId: 'free' as PlanId,
      plan: PLANS.free,
      status: 'active',
      creditsRemaining: 0,
      cycleEndsAt: null,
      cancelAtPeriodEnd: false,
      autoRebillEnabled: true,
    });
  }

  const planId = (sub.plan_id as PlanId) in PLANS ? (sub.plan_id as PlanId) : 'free';
  return NextResponse.json({
    planId,
    plan: PLANS[planId],
    status: sub.status,
    creditsRemaining: sub.credits_remaining,
    cycleEndsAt: sub.cycle_ends_at,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    autoRebillEnabled: sub.auto_rebill_enabled,
  });
}
