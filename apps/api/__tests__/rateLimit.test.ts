import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { rateLimit } from '../src/middleware/rateLimit.js';

function makeApp(max: number) {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 60_000,
      max,
      // Bucket by a fixed header so multiple concurrent test runs don't
      // pollute each other's buckets and we don't depend on req.ip resolution.
      keyFn: (req) => req.get('x-test-key') ?? 'default',
      label: 'test',
    }),
  );
  app.get('/ping', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('rateLimit middleware', () => {
  it('lets `max` requests through then returns 429 with Retry-After', async () => {
    const max = 5;
    const app = makeApp(max);

    for (let i = 0; i < max; i++) {
      const r = await request(app).get('/ping').set('x-test-key', 'bucket-a');
      expect(r.status).toBe(200);
    }

    const limited = await request(app).get('/ping').set('x-test-key', 'bucket-a');
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ error: 'rate_limited' });
    expect(limited.body.retryAfter).toBeGreaterThan(0);
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('isolates buckets by key', async () => {
    const app = makeApp(2);

    // Burn through bucket A's quota
    await request(app).get('/ping').set('x-test-key', 'a');
    await request(app).get('/ping').set('x-test-key', 'a');
    const aBlocked = await request(app).get('/ping').set('x-test-key', 'a');
    expect(aBlocked.status).toBe(429);

    // Bucket B is unaffected
    const bOk = await request(app).get('/ping').set('x-test-key', 'b');
    expect(bOk.status).toBe(200);
  });
});
