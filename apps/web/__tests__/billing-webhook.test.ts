import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// ─── Env wiring ──────────────────────────────────────────────────────────────
// The runner provides SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as the API
// integration suite). The webhook route reads NEXT_PUBLIC_SUPABASE_URL,
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET at import time — so we set those
// here BEFORE the dynamic import of the route in beforeAll.
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Tests require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
}

const WEBHOOK_SECRET = 'whsec_ci_test_secret_value';
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.STRIPE_SECRET_KEY ||= 'sk_test_dummy_key';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Imported lazily so the env above is in place first.
let POST: (req: NextRequest) => Promise<Response>;

const tenants: string[] = [];
const sessions: string[] = [];
const events: string[] = [];

beforeAll(async () => {
  ({ POST } = (await import('../src/app/api/billing/webhook/route')) as {
    POST: (req: NextRequest) => Promise<Response>;
  });
});

afterAll(async () => {
  for (const id of events) await admin.from('processed_stripe_events').delete().eq('event_id', id);
  for (const id of sessions)
    await admin.from('stripe_topup_sessions').delete().eq('session_id', id);
  for (const id of tenants) await admin.from('tenants').delete().eq('id', id);
});

async function makeTenant(): Promise<string> {
  const slug = `whk-${randomUUID().slice(0, 8)}`;
  const { data, error } = await admin
    .from('tenants')
    .insert({ name: 'Webhook Test', slug })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('failed to create tenant');
  tenants.push(data.id);
  return data.id;
}

async function makePendingSession(tenantId: string, credits: number): Promise<string> {
  const sessionId = `cs_test_${randomUUID()}`;
  sessions.push(sessionId);
  const { error } = await admin.from('stripe_topup_sessions').insert({
    session_id: sessionId,
    tenant_id: tenantId,
    amount_usd_cents: credits,
    credits,
    status: 'pending',
  });
  if (error) throw error;
  return sessionId;
}

async function balanceOf(tenantId: string): Promise<number> {
  const { data } = await admin
    .from('tenant_credits')
    .select('balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

function topupEvent(opts: {
  sessionId: string;
  tenantId: string;
  credits: number;
  eventId?: string;
}) {
  const eventId = opts.eventId ?? `evt_${randomUUID()}`;
  events.push(eventId);
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: opts.sessionId,
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        client_reference_id: opts.tenantId,
        amount_total: opts.credits,
        metadata: {
          tenant_id: opts.tenantId,
          // user_id omitted → actor_id is null (a valid "system entry"); a fake
          // non-UUID here would fail the actor_id → auth.users FK.
          credits: String(opts.credits),
          amount_usd_cents: String(opts.credits),
          kind: 'topup',
        },
      },
    },
  };
}

function postEvent(event: object, sig?: string): Promise<Response> {
  const payload = JSON.stringify(event);
  const signature = sig ?? stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  const req = new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body: payload,
  });
  return POST(req);
}

describe('POST /api/billing/webhook — credit top-ups', () => {
  it('credits the ledger and balance on a paid checkout.session.completed', async () => {
    const tenantId = await makeTenant();
    const sessionId = await makePendingSession(tenantId, 1000);

    const res = await postEvent(topupEvent({ sessionId, tenantId, credits: 1000 }));
    expect(res.status).toBe(200);

    expect(await balanceOf(tenantId)).toBe(1000);

    const { data: ledger } = await admin
      .from('credit_ledger')
      .select('kind, amount, ref_id')
      .eq('tenant_id', tenantId);
    expect(ledger).toContainEqual(
      expect.objectContaining({ kind: 'topup', amount: 1000, ref_id: sessionId }),
    );

    const { data: sess } = await admin
      .from('stripe_topup_sessions')
      .select('status')
      .eq('session_id', sessionId)
      .single();
    expect(sess?.status).toBe('completed');
  });

  it('is idempotent — a replayed event does not double-credit', async () => {
    const tenantId = await makeTenant();
    const sessionId = await makePendingSession(tenantId, 500);
    const event = topupEvent({ sessionId, tenantId, credits: 500 });

    const first = await postEvent(event);
    expect(first.status).toBe(200);

    const second = await postEvent(event); // same event id → dedup
    expect(second.status).toBe(200);
    expect((await second.json()).replay).toBe(true);

    expect(await balanceOf(tenantId)).toBe(500); // not 1000
  });

  it('rejects a bad signature with 400', async () => {
    const tenantId = await makeTenant();
    const sessionId = await makePendingSession(tenantId, 100);
    const res = await postEvent(topupEvent({ sessionId, tenantId, credits: 100 }), 't=1,v1=deadbeef');
    expect(res.status).toBe(400);
    expect(await balanceOf(tenantId)).toBe(0);
  });

  it('refuses to credit when the event tenant does not own the session', async () => {
    const tenantA = await makeTenant();
    const tenantB = await makeTenant();
    // Pending row is owned by A, but the event claims B.
    const sessionId = await makePendingSession(tenantA, 1000);

    const res = await postEvent(topupEvent({ sessionId, tenantId: tenantB, credits: 1000 }));
    expect(res.status).toBe(200); // acknowledged, but...
    expect(await balanceOf(tenantB)).toBe(0); // ...B is not credited
    expect(await balanceOf(tenantA)).toBe(0); // ...and neither is A (mismatch → skip)
  });
});
