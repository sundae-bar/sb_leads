// Idempotency / dedup for the paid x402 endpoint — keyed by WHO + WHAT, not the
// payment nonce (which changes on every retry and so never matched).
//
// The key is an explicit `Idempotency-Key` header if present, else
// `hash(payer_address + normalized_request)`. Both are stable across a buyer's
// retries, so a retry storm for one lookup collapses to a single charge.
//
// Two stores, same TTL:
//   • deliverableCache — cached successful deliverables, so a retry is served
//     without re-spending providers.
//   • settledKeys      — keys that have been (or are being) charged. Written by
//     the onBeforeSettle hook (integrations/x402/settlement.ts); it is the
//     AUTHORITATIVE double-charge guard. The handler reads it only to report
//     `charged` accurately.
//
// LIMITATIONS (see docs/x402.md): scoped per payer, so a *different* wallet (or
// changed input) is correctly a new charge. In-process only — fine for the
// single-replica deploy, lost on redeploy, not shared across instances. To
// scale, replace the `idempotency` object below with a Supabase-backed store;
// it is the single seam the handler + hook depend on.
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { normalizeLinkedinUrl } from '@scoop/types';
import type { LookupOutcome, X402Deliverable } from './responses.js';

const TTL_MS = 15 * 60_000; // anti-double-charge window

const deliverableCache = new LRUCache<string, X402Deliverable>({
  max: 5_000,
  ttl: TTL_MS,
});
const settledKeys = new LRUCache<string, true>({ max: 20_000, ttl: TTL_MS });

// In-flight lock: concurrent requests for the same key JOIN the running lookup
// instead of each starting their own provider waterfall. Without this, N
// simultaneous duplicates (each a freshly-signed authorization from the same
// wallet) would all miss the deliverable cache, run N provider fan-outs, and
// only one would be charged — an N× provider-spend amplification for one
// payment. Entries are removed when the original lookup completes, so the map
// is bounded by in-flight request concurrency.
const inFlight = new Map<string, Promise<LookupOutcome>>();

export const idempotency = {
  getDeliverable: (key: string): X402Deliverable | undefined =>
    deliverableCache.get(key),
  cacheDeliverable: (key: string, d: X402Deliverable): void => {
    deliverableCache.set(key, d);
  },
  isSettled: (key: string): boolean => settledKeys.has(key),
  markSettled: (key: string): void => {
    settledKeys.set(key, true);
  },
  unmarkSettled: (key: string): void => {
    settledKeys.delete(key);
  },
  getInFlight: (key: string): Promise<LookupOutcome> | undefined =>
    inFlight.get(key),
  setInFlight: (key: string, p: Promise<LookupOutcome>): void => {
    inFlight.set(key, p);
  },
  clearInFlight: (key: string): void => {
    inFlight.delete(key);
  },
};

/**
 * Derive the per-buyer dedup key. Explicit `Idempotency-Key` wins; otherwise a
 * hash of (route + payer + normalized request body). Returns null when we
 * can't key it — in which case we simply don't dedup (never a hard failure).
 *
 * `route` is REQUIRED and part of both key forms so that when a second paid
 * x402 service is added (docs/extending.md §3), the same payer + similar body
 * can never hit another service's cached deliverable. The handler passes
 * `req.path`; the settle hook reads the same path off the transport context —
 * both see the identical string for a given request.
 */
export function deriveDedupeKey(input: {
  idempotencyKey?: string | null;
  payer?: string | null;
  body: unknown;
  route: string;
}): string | null {
  const explicit = input.idempotencyKey?.trim();
  if (explicit) return `key:${input.route}:${explicit}`;
  if (input.payer) {
    const hash = createHash('sha256')
      .update(`${input.route}|${input.payer.toLowerCase()}|${normalizeBody(input.body)}`)
      .digest('hex');
    return `pc:${hash}`;
  }
  return null;
}

/**
 * Canonical string for a find-email request body so semantically-identical
 * requests (protocol/casing/www variants, key order) collapse to one key.
 * Mirrors the fields the handler's schema accepts. Both the handler (raw
 * req.body) and the settle hook (adapter.getBody()) feed the same object here,
 * so their keys match.
 */
function normalizeBody(body: unknown): string {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const url =
    typeof b.linkedin_url === 'string' && b.linkedin_url
      ? normalizeLinkedinUrl(b.linkedin_url)
      : '';
  const types = Array.isArray(b.email_types)
    ? [...b.email_types].map((t) => String(t)).sort()
    : [];
  return JSON.stringify({
    url,
    full_name: str(b.full_name),
    first_name: str(b.first_name),
    last_name: str(b.last_name),
    company_domain: str(b.company_domain),
    company_name: str(b.company_name),
    email_types: types,
    verify: b.verify === true,
  });
}

/**
 * Pull `{ from, nonce }` out of an `X-PAYMENT` / `payment-signature` header
 * (base64 JSON, exact EVM scheme). Fail open (null) on any parse error.
 */
export function parsePaymentAuth(
  headerValue: string | undefined,
): { from?: string; nonce?: string } | null {
  if (!headerValue) return null;
  try {
    const padded = headerValue + '='.repeat((4 - (headerValue.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as {
      payload?: { authorization?: { from?: unknown; nonce?: unknown } };
    };
    const auth = json?.payload?.authorization;
    return {
      from: typeof auth?.from === 'string' ? auth.from : undefined,
      nonce: typeof auth?.nonce === 'string' ? auth.nonce : undefined,
    };
  } catch {
    return null;
  }
}
