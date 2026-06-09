import { beforeEach, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { FindEmailResult, NormalizedEmail } from '@scoop/types';

// The x402 handler reaches findEmails + config + logger through module-level
// singletons. We replace them with controllable fakes so we can assert the
// status→billing CONTRACT in isolation: status >=400 is exactly what makes the
// real @x402/express middleware cancel (no charge) instead of settle, so
// asserting the handler's status + `charged` flag is what proves the payment
// behavior. A tiny mocked timeout (200ms) keeps the timeout case fast while
// leaving the concurrency tests room to release their deferred lookups.
vi.mock('../src/services/findEmail.js', () => ({ findEmails: vi.fn() }));
vi.mock('../src/logger.js', () => ({
  logger: { warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
}));
vi.mock('../src/config.js', () => ({
  config: { x402: { findEmailTimeoutMs: 200 } },
  isProviderConfigured: () => true,
}));

import { x402FindEmailRouter } from '../src/routes/x402-find-email.js';
import { findEmails } from '../src/services/findEmail.js';
import { deriveDedupeKey, idempotency } from '../src/integrations/x402/idempotency.js';
import {
  dedupeBeforeSettle,
  dedupeOnSettleFailure,
} from '../src/integrations/x402/settlement.js';

const mockFind = vi.mocked(findEmails);

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(x402FindEmailRouter);
  return app;
}

const workEmail: NormalizedEmail = {
  address: 'jane@acme.com',
  type: 'work',
  verified: false,
  source_provider: 'apollo',
};

function resultWith(emails: NormalizedEmail[]): FindEmailResult[] {
  return [
    {
      linkedin_url: 'https://linkedin.com/in/jane',
      emails,
      person: { full_name: 'Jane Doe' },
      company: { name: 'Acme' },
      providers_attempted: [
        { provider: 'apollo', found: emails.length > 0, error: null },
      ],
      credits_used: 1,
    },
  ];
}

const URL_BODY = { linkedin_url: 'https://www.linkedin.com/in/jane/' };

describe('POST /x402/find-email — payment-safety contract', () => {
  beforeEach(() => {
    mockFind.mockReset();
  });

  it('200 + charged:true when at least one email is found', async () => {
    mockFind.mockResolvedValue(resultWith([workEmail]));
    const r = await request(makeApp()).post('/x402/find-email').send(URL_BODY);
    expect(r.status).toBe(200);
    expect(r.body.charged).toBe(true);
    expect(r.body.emails).toHaveLength(1);
    expect(r.body.requestId).toBeTruthy();
  });

  it('404 + charged:false when zero emails are found (buyer not charged)', async () => {
    mockFind.mockResolvedValue(resultWith([]));
    const r = await request(makeApp()).post('/x402/find-email').send(URL_BODY);
    expect(r.status).toBe(404);
    expect(r.body.charged).toBe(false);
    expect(r.body.error.code).toBe('no_email_found');
    expect(r.body.providers_attempted).toBeDefined();
  });

  it('504 + retryable when the lookup exceeds the deadline (buyer not charged)', async () => {
    let received: { signal?: AbortSignal } | undefined;
    mockFind.mockImplementation((opts: { signal?: AbortSignal }) => {
      received = opts;
      return new Promise(() => {}); // never resolves
    });
    const r = await request(makeApp()).post('/x402/find-email').send(URL_BODY);
    expect(r.status).toBe(504);
    expect(r.body.charged).toBe(false);
    expect(r.body.error.code).toBe('provider_timeout');
    expect(r.body.retryable).toBe(true);
    // The deadline must also CANCEL the orphaned lookup so it stops spending
    // on providers for a response nobody will receive.
    expect(received?.signal?.aborted).toBe(true);
  });

  it('400 + charged:false on invalid input, without touching providers', async () => {
    const r = await request(makeApp()).post('/x402/find-email').send({});
    expect(r.status).toBe(400);
    expect(r.body.charged).toBe(false);
    expect(r.body.error.code).toBe('invalid_input');
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('502 + charged:false when the service throws unexpectedly', async () => {
    mockFind.mockRejectedValue(new Error('boom'));
    const r = await request(makeApp()).post('/x402/find-email').send(URL_BODY);
    expect(r.status).toBe(502);
    expect(r.body.charged).toBe(false);
    expect(r.body.error.code).toBe('provider_error');
  });
});

describe('POST /x402/find-email — idempotency (provider-spend + charge reporting)', () => {
  beforeEach(() => {
    mockFind.mockReset();
    mockFind.mockResolvedValue(resultWith([workEmail]));
  });

  it('serves a repeat request from cache without re-spending providers', async () => {
    const app = makeApp();
    const headers = { 'Idempotency-Key': 'cache-reuse' };

    const first = await request(app)
      .post('/x402/find-email')
      .set(headers)
      .send(URL_BODY);
    const second = await request(app)
      .post('/x402/find-email')
      .set(headers)
      .send(URL_BODY);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.emails).toHaveLength(1);
    // findEmails ran only once — the second was served from the cache.
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it('reports charged:false + duplicate once the request has been settled', async () => {
    const app = makeApp();
    const key = 'already-settled';

    // First call populates the deliverable cache.
    await request(app).post('/x402/find-email').set('Idempotency-Key', key).send(URL_BODY);

    // Simulate the onBeforeSettle hook having charged this key.
    idempotency.markSettled(
      deriveDedupeKey({ idempotencyKey: key, body: URL_BODY, route: '/x402/find-email' })!,
    );

    const replay = await request(app)
      .post('/x402/find-email')
      .set('Idempotency-Key', key)
      .send(URL_BODY);
    expect(replay.status).toBe(200);
    expect(replay.body.charged).toBe(false);
    expect(replay.body.duplicate).toBe(true);
    expect(replay.body.emails).toHaveLength(1);
  });
});

describe('POST /x402/find-email — in-flight lock (concurrent duplicates)', () => {
  beforeEach(() => {
    mockFind.mockReset();
  });

  it('collapses concurrent identical requests into ONE provider run', async () => {
    let release!: (v: FindEmailResult[]) => void;
    mockFind.mockImplementation(
      () => new Promise<FindEmailResult[]>((r) => (release = r)),
    );
    const app = makeApp();
    const headers = { 'Idempotency-Key': 'concurrent-success' };

    // .then() forces supertest to dispatch immediately (Tests are lazy).
    const p1 = request(app).post('/x402/find-email').set(headers).send(URL_BODY).then((r) => r);
    const p2 = request(app).post('/x402/find-email').set(headers).send(URL_BODY).then((r) => r);

    // Let both handlers reach the lock before the lookup resolves.
    await new Promise((r) => setTimeout(r, 25));
    release(resultWith([workEmail]));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.emails).toHaveLength(1);
    expect(r2.body.emails).toHaveLength(1);
    // The amplification check: one waterfall for two concurrent requests.
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it('concurrent duplicates share a failure outcome, then the lock clears for retries', async () => {
    mockFind.mockImplementation(() => new Promise(() => {})); // hang → 504 via timeout
    const app = makeApp();
    const headers = { 'Idempotency-Key': 'concurrent-failure' };

    const p1 = request(app).post('/x402/find-email').set(headers).send(URL_BODY).then((r) => r);
    const p2 = request(app).post('/x402/find-email').set(headers).send(URL_BODY).then((r) => r);
    const [r1, r2] = await Promise.all([p1, p2]);

    // Both share the single timed-out run: one provider call, both not charged.
    expect(r1.status).toBe(504);
    expect(r2.status).toBe(504);
    expect(mockFind).toHaveBeenCalledTimes(1);

    // Failures are not cached and the lock is cleared — a later retry runs fresh.
    mockFind.mockResolvedValue(resultWith([workEmail]));
    const r3 = await request(app).post('/x402/find-email').set(headers).send(URL_BODY);
    expect(r3.status).toBe(200);
    expect(r3.body.charged).toBe(true);
    expect(mockFind).toHaveBeenCalledTimes(2);
  });
});

describe('x402 onBeforeSettle hook — double-charge guard', () => {
  // A minimal SettleContext: payer in the payment payload, request body via the
  // transport adapter, network in requirements.
  function makeCtx(payer: string, body: unknown) {
    return {
      paymentPayload: { payload: { authorization: { from: payer } } },
      requirements: { network: 'eip155:84532' },
      declaredExtensions: {},
      transportContext: {
        request: {
          path: '/x402/find-email',
          adapter: { getHeader: () => undefined, getBody: () => body },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it('allows the first settlement, then skips the duplicate (no second charge)', async () => {
    const ctx = makeCtx('0xPayerA', { linkedin_url: 'https://www.linkedin.com/in/dup/' });

    const first = await dedupeBeforeSettle(ctx);
    expect(first).toBeUndefined(); // allow the real settlement

    const second = await dedupeBeforeSettle(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((second as any)?.skip).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((second as any)?.result?.success).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((second as any)?.result?.transaction).toBe(''); // no on-chain settle
  });

  it('fails open (never blocks settlement) when the transport context has no path', async () => {
    // If a library upgrade drops `path` from the transport context, the hook
    // must not derive a key that can't match the handler's — it should skip
    // dedup entirely and allow every settlement.
    const ctx = makeCtx('0xPayerC', { linkedin_url: 'https://www.linkedin.com/in/nopath/' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (ctx as any).transportContext.request.path;

    expect(await dedupeBeforeSettle(ctx)).toBeUndefined();
    expect(await dedupeBeforeSettle(ctx)).toBeUndefined(); // still allowed — no dedup
  });

  it('un-marks on settle failure so the retry is charged again', async () => {
    const ctx = makeCtx('0xPayerB', { linkedin_url: 'https://www.linkedin.com/in/fail/' });

    await dedupeBeforeSettle(ctx); // marks settled
    await dedupeOnSettleFailure(ctx); // un-marks (settlement failed)

    const retry = await dedupeBeforeSettle(ctx);
    expect(retry).toBeUndefined(); // allowed again, not treated as duplicate
  });
});
