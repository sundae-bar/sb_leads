// Simple in-memory sliding-window rate limiter.
//
// IMPORTANT: state lives in the API process. This is fine for a single-instance
// soft launch but MUST be replaced by a Redis-backed implementation before
// scaling to multiple API instances or opening public signups — otherwise a
// burst attacker can amortise their quota across instances. See the launch
// plan for the migration path.
import { LRUCache } from 'lru-cache';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export interface RateLimitOptions {
  windowMs: number;
  /** Max requests per key within the window. */
  max: number;
  /** Override the bucketing key. Defaults to `req.user?.tenantId ?? req.ip`. */
  keyFn?: (req: Request) => string | undefined;
  /** Used in 429 responses + logs to identify which limiter tripped. */
  label?: string;
}

interface Bucket {
  /** Monotonic timestamps (ms) of recent hits within the window. */
  hits: number[];
}

export function rateLimit(opts: RateLimitOptions) {
  // Each bucket lives at most `windowMs * 2` before being evicted — generous
  // headroom so we don't drop active sessions, but bounded so memory can't
  // grow forever from one-off IPs.
  const buckets = new LRUCache<string, Bucket>({
    max: 10_000,
    ttl: opts.windowMs * 2,
    updateAgeOnGet: true,
  });

  const defaultKeyFn = (req: Request): string | undefined =>
    req.user?.tenantId ?? req.ip;

  const keyFn = opts.keyFn ?? defaultKeyFn;
  const label = opts.label ?? 'rateLimit';

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = keyFn(req);
    if (!key) {
      // Nothing identifying about the request — let it through (this happens
      // only with mis-configured proxies stripping req.ip; the auth middleware
      // downstream will reject it if relevant).
      next();
      return;
    }

    const now = Date.now();
    const cutoff = now - opts.windowMs;

    const bucket = buckets.get(key) ?? { hits: [] };
    // Drop hits older than the window.
    while (bucket.hits.length > 0 && (bucket.hits[0] as number) < cutoff) {
      bucket.hits.shift();
    }

    if (bucket.hits.length >= opts.max) {
      const oldestHit = bucket.hits[0] as number;
      const retryAfterSec = Math.max(1, Math.ceil((oldestHit + opts.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      logger.warn(
        { label, key, hits: bucket.hits.length, retryAfter: retryAfterSec, path: req.path },
        'rate limit exceeded',
      );
      res.status(429).json({ error: 'rate_limited', retryAfter: retryAfterSec });
      return;
    }

    bucket.hits.push(now);
    buckets.set(key, bucket);
    next();
  };
}
