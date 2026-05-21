import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redeemCoupon } from '@/lib/billing';

/**
 * Redeem a coupon code for credits. Delegates to the SECURITY DEFINER RPC
 * `redeem_coupon` so all validation (auth, tenant membership, expiry,
 * exhaustion, single-use-per-tenant) + the ledger write happen atomically
 * in Postgres.
 *
 * Uses the user-scoped supabase client (not adminDb) so the RPC's internal
 * `auth.uid()` and `get_active_tenant_id()` calls resolve correctly.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await redeemCoupon(supabase, code);

  if (!result.ok) {
    // Map the RPC's error codes to HTTP status codes. The Crumble-style RPC
    // returns 200 with an `ok:false` body even on failure (so a single
    // round-trip carries the verdict); we surface the verdict as the body
    // and pick an appropriate status here.
    const status =
      result.error === 'invalid_code' ||
      result.error === 'expired' ||
      result.error === 'disabled' ||
      result.error === 'exhausted'
        ? 404
        : result.error === 'already_redeemed'
          ? 409
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
