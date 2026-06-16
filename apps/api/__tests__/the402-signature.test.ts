import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '../src/integrations/the402/signature.js';

const SECRET = 'whsec_test_0123456789abcdef';

/** Produce a valid HMAC exactly as the402 does: hex(HMAC-SHA256(`${ts}.${body}`)). */
function sign(body: string, tsSec: number, secret = SECRET): string {
  const payload = Buffer.concat([Buffer.from(`${tsSec}.`, 'utf8'), Buffer.from(body, 'utf8')]);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

const now = () => Math.floor(Date.now() / 1000);

describe('verifyWebhookSignature (the402 HMAC)', () => {
  const body = JSON.stringify({ event: 'job.created', job_id: 'job_123' });

  it('accepts a correctly signed, fresh request', () => {
    const ts = now();
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, ts),
      timestampHeader: String(ts),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: true });
  });

  it('strips a `sha256=` prefix on the signature', () => {
    const ts = now();
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: `sha256=${sign(body, ts)}`,
      timestampHeader: String(ts),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: true });
  });

  it('verifies against a Buffer body identically to a string body', () => {
    const ts = now();
    const res = verifyWebhookSignature({
      rawBody: Buffer.from(body, 'utf8'),
      signatureHeader: sign(body, ts),
      timestampHeader: String(ts),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: true });
  });

  it('rejects a missing signature header', () => {
    const ts = now();
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: undefined,
      timestampHeader: String(ts),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'missing_headers' });
  });

  it('rejects a missing timestamp header', () => {
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, now()),
      timestampHeader: undefined,
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'missing_headers' });
  });

  it('rejects a non-numeric timestamp', () => {
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, now()),
      timestampHeader: 'not-a-number',
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'missing_headers' });
  });

  it('rejects a stale timestamp older than maxAge (replay defence)', () => {
    const oldTs = now() - 301; // default maxAge is 300s
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, oldTs),
      timestampHeader: String(oldTs),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'stale_timestamp' });
  });

  it('rejects a timestamp too far in the future', () => {
    const futureTs = now() + 301;
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, futureTs),
      timestampHeader: String(futureTs),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'stale_timestamp' });
  });

  it('honours a custom maxAgeSeconds window', () => {
    const ts = now() - 30;
    const sig = sign(body, ts);
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: sig,
        timestampHeader: String(ts),
        secret: SECRET,
        maxAgeSeconds: 10,
      }),
    ).toEqual({ ok: false, reason: 'stale_timestamp' });
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: sig,
        timestampHeader: String(ts),
        secret: SECRET,
        maxAgeSeconds: 60,
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a tampered body', () => {
    const ts = now();
    const sig = sign(body, ts);
    const res = verifyWebhookSignature({
      rawBody: body + 'x', // body mutated after signing
      signatureHeader: sig,
      timestampHeader: String(ts),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a signature made with the wrong secret', () => {
    const ts = now();
    const res = verifyWebhookSignature({
      rawBody: body,
      signatureHeader: sign(body, ts, 'whsec_attacker_guess'),
      timestampHeader: String(ts),
      secret: SECRET,
    });
    expect(res).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a non-hex / wrong-length signature without throwing', () => {
    const ts = now();
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: 'zzzz-not-hex',
        timestampHeader: String(ts),
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'bad_signature' });
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: 'ab', // valid hex but wrong length
        timestampHeader: String(ts),
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });
});
