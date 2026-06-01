import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Tests require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const tenants: string[] = [];
const events: string[] = [];

async function makeTenant(credits = 100): Promise<string> {
  const slug = `bill-${randomUUID().slice(0, 8)}`;
  const { data, error } = await admin
    .from('tenants')
    .insert({ name: 'Billing Test', slug })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('failed to create tenant');
  tenants.push(data.id);

  // Seed the legacy subscriptions row (still used for plan info + the lifecycle
  // tests below). credits_remaining is NOT the source of truth post-0016.
  await admin.from('subscriptions').upsert({
    tenant_id: data.id,
    plan_id: 'free',
    credits_remaining: credits,
  });

  // Seed the actual credit balance via the ledger. The
  // apply_ledger_to_tenant_credits trigger materialises tenant_credits.balance,
  // which is what consume_credits reads/decrements (migration 0016).
  if (credits > 0) {
    const { error: ledgerErr } = await admin.from('credit_ledger').insert({
      tenant_id: data.id,
      amount: credits,
      kind: 'grant',
      description: 'test seed',
    });
    if (ledgerErr) throw ledgerErr;
  }

  return data.id;
}

/** Ledger-derived balance — the post-0016 source of truth consume_credits uses. */
async function balanceOf(tenantId: string): Promise<number> {
  const { data } = await admin
    .from('tenant_credits')
    .select('balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

afterAll(async () => {
  for (const eventId of events) {
    await admin.from('processed_stripe_events').delete().eq('event_id', eventId);
  }
  for (const tenantId of tenants) {
    await admin.from('tenants').delete().eq('id', tenantId);
  }
});

describe('consume_credits SQL function', () => {
  it('decrements when sufficient and returns true', async () => {
    const tenantId = await makeTenant(10);
    const { data: ok } = await admin.rpc('consume_credits', {
      p_tenant_id: tenantId,
      p_amount: 3,
    });
    expect(ok).toBe(true);
    expect(await balanceOf(tenantId)).toBe(7);
  });

  it('returns false and does not decrement when insufficient', async () => {
    const tenantId = await makeTenant(2);
    const { data: ok } = await admin.rpc('consume_credits', {
      p_tenant_id: tenantId,
      p_amount: 5,
    });
    expect(ok).toBe(false);
    expect(await balanceOf(tenantId)).toBe(2); // unchanged
  });

  it('is race-safe under concurrent decrements', async () => {
    // Start with 50 credits, fire 100 concurrent decrements of 1.
    // Exactly 50 must succeed, 50 must fail, ending at 0.
    const tenantId = await makeTenant(50);

    const calls = Array.from({ length: 100 }, () =>
      admin.rpc('consume_credits', { p_tenant_id: tenantId, p_amount: 1 }),
    );
    const results = await Promise.all(calls);
    const successes = results.filter((r) => r.data === true).length;
    const failures = results.filter((r) => r.data === false).length;
    expect(successes).toBe(50);
    expect(failures).toBe(50);
    expect(await balanceOf(tenantId)).toBe(0);
  });
});

describe('webhook idempotency table', () => {
  it('rejects duplicate event_id with unique violation', async () => {
    const eventId = `evt_test_${randomUUID()}`;
    events.push(eventId);

    const first = await admin
      .from('processed_stripe_events')
      .insert({ event_id: eventId, event_type: 'invoice.payment_succeeded' });
    expect(first.error).toBeNull();

    const second = await admin
      .from('processed_stripe_events')
      .insert({ event_id: eventId, event_type: 'invoice.payment_succeeded' });
    expect(second.error).not.toBeNull();
    expect(second.error?.code).toBe('23505');
  });
});

describe('subscriptions row lifecycle', () => {
  it('seeded with free plan + default credits', async () => {
    const tenantId = await makeTenant(100);
    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan_id, status, credits_remaining')
      .eq('tenant_id', tenantId)
      .single();
    expect(sub?.plan_id).toBe('free');
    expect(sub?.status).toBe('active');
    expect(sub?.credits_remaining).toBe(100);
  });

  it('cascade-deletes when tenant is deleted', async () => {
    const tenantId = await makeTenant(10);
    await admin.from('tenants').delete().eq('id', tenantId);
    // Remove from cleanup list since we just deleted it.
    const i = tenants.indexOf(tenantId);
    if (i >= 0) tenants.splice(i, 1);

    const { data: sub } = await admin
      .from('subscriptions')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    expect(sub).toBeNull();
  });
});
