// HMAC verification for the402.ai webhooks.
//
// the402.ai signs each webhook with HMAC-SHA256 over `${timestamp}.${rawBody}`
// using the per-provider webhook secret. We verify in constant time and
// reject timestamps older than 5 minutes to prevent replay attacks.
import crypto from 'node:crypto';

export interface VerifyParams {
  rawBody: Buffer | string;
  signatureHeader: string | undefined;
  timestampHeader: string | undefined;
  secret: string;
  /** Max age of the signed timestamp, in seconds. Default 5 min. */
  maxAgeSeconds?: number;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing_headers' | 'stale_timestamp' | 'bad_signature' };

export function verifyWebhookSignature(params: VerifyParams): VerifyResult {
  const { signatureHeader, timestampHeader, secret } = params;
  if (!signatureHeader || !timestampHeader) {
    return { ok: false, reason: 'missing_headers' };
  }

  const timestampSec = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestampSec)) {
    return { ok: false, reason: 'missing_headers' };
  }

  const maxAge = params.maxAgeSeconds ?? 300;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > maxAge) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  const body =
    typeof params.rawBody === 'string' ? Buffer.from(params.rawBody, 'utf8') : params.rawBody;
  const signedPayload = Buffer.concat([
    Buffer.from(`${timestampSec}.`, 'utf8'),
    body,
  ]);

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Strip any `sha256=` prefix the402 may use, just in case.
  const provided = signatureHeader.replace(/^sha256=/, '').trim();

  const expectedBuf = Buffer.from(expectedHex, 'hex');
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(provided, 'hex');
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }

  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: 'bad_signature' };
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: 'bad_signature' };
  }
  return { ok: true };
}
