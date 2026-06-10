// Route handler for `POST /x402/find-email`.
//
// IMPORTANT: this handler only runs AFTER the x402 payment middleware has
// VERIFIED the buyer's USDC payment (off-chain signature check — no funds have
// moved yet). The middleware SETTLES (moves funds) only if we return a 2xx, and
// CANCELS on any >=400. The on-chain payment IS the billing — we do NOT call
// consumeCredits here.
//
// PAYMENT SAFETY (see the full lifecycle in docs/x402.md):
//   • >=1 email        -> 200 -> settle (buyer charged)
//   • 0 emails         -> 404 -> cancel (buyer NOT charged)
//   • timeout          -> 504 -> cancel (buyer NOT charged, retryable)
//   • duplicate        -> 200 from cache, onBeforeSettle skips the 2nd charge
//   • bad input/error  -> 4xx/5xx -> cancel (buyer NOT charged)
// We never charge for an empty or failed lookup — returning >=400 is what makes
// the middleware cancel instead of settle.
//
// PROVIDER-SPEND SAFETY: concurrent duplicates of the same (payer + request)
// JOIN the in-flight lookup (idempotency.ts) instead of each running the
// provider waterfall — otherwise one 0.25 USDC payment could fan out into N
// provider spends. All joined requests share one LookupOutcome, success or
// failure.
//
// Same `findEmails()` service powers the dashboard, the chat MCP tool, and the
// the402 webhook — but those paths keep their own (200 + refund) semantics. The
// no-charge-on-empty behavior below is specific to this handler.
import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { findEmails } from '../services/findEmail.js';
import { withTimeout } from '../lib/withTimeout.js';
import { HttpError } from '../middleware/error.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  sendX402Error,
  buildDeliverable,
  type LookupOutcome,
} from '../integrations/x402/responses.js';
import {
  idempotency,
  deriveDedupeKey,
  parsePaymentAuth,
} from '../integrations/x402/idempotency.js';
import type { EmailType } from '@scoop/types';

/**
 * Two input modes (mirrors the MCP tool + REST endpoint):
 *   - URL mode  — pass `linkedin_url`.
 *   - Name mode — pass `full_name` + one of `company_domain` / `company_name`.
 * The refinement below rejects mixed or empty input.
 */
const bodySchema = z
  .object({
    linkedin_url: z.string().url().optional(),
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_domain: z.string().optional(),
    company_name: z.string().optional(),
    email_types: z.array(z.enum(['work', 'personal'])).optional(),
    verify: z.boolean().optional(),
  })
  .refine(
    (v) => {
      const hasUrl = Boolean(v.linkedin_url);
      const hasName = Boolean(v.full_name);
      const hasCompany = Boolean(v.company_domain || v.company_name);
      if (hasUrl && hasName) return false;
      if (hasUrl) return true;
      return hasName && hasCompany;
    },
    {
      message:
        'provide either linkedin_url OR full_name + company_domain/company_name',
    },
  );

/**
 * Run the bounded provider lookup and map EVERY result — success or failure —
 * to a LookupOutcome value. Never throws: concurrent duplicates await this
 * promise through the in-flight lock, and a rejection would surface to them as
 * an unhandled error instead of a billing-safe response.
 */
async function performLookup(
  body: z.infer<typeof bodySchema>,
  requestId: string,
): Promise<LookupOutcome> {
  const isNameMode = !body.linkedin_url && Boolean(body.full_name);
  const findInput = isNameMode
    ? {
        name_queries: [
          {
            kind: 'name' as const,
            full_name: body.full_name!,
            first_name: body.first_name,
            last_name: body.last_name,
            company_domain: body.company_domain,
            company_name: body.company_name,
          },
        ],
      }
    : {
        linkedin_urls: [body.linkedin_url!],
      };
  // `requestedTypes` is undefined when the caller didn't specify — we still
  // search for both, but a defaulted request can't be "partial" (see below).
  const requestedTypes = body.email_types as EmailType[] | undefined;
  const emailTypes = requestedTypes ?? (['work', 'personal'] as EmailType[]);

  // Aborted when the deadline fires, so the orphaned findEmails run stops
  // spending on providers for a response nobody will receive: the waterfall
  // breaks before its next round and in-flight provider HTTP calls cancel.
  const cancel = new AbortController();
  try {
    const results = await withTimeout(
      findEmails({
        ...findInput,
        providers: undefined,
        waterfall: true,
        email_types: emailTypes,
        verify: body.verify ?? false,
        request_id: requestId,
        signal: cancel.signal,
      }),
      config.x402.findEmailTimeoutMs,
      () => {
        cancel.abort();
        return new HttpError(504, 'provider_timeout');
      },
    );

    const result = results[0];
    const emails = result?.emails ?? [];

    // No deliverable → don't charge.
    if (emails.length === 0) {
      return {
        ok: false,
        status: 404,
        code: 'no_email_found',
        message: 'No email found for the given input',
        retryable: false,
        providersAttempted: result?.providers_attempted ?? [],
      };
    }

    // `partial` is only meaningful when the caller EXPLICITLY asked for types:
    // true when they did and we couldn't return all of them. A defaulted
    // request has no expectation to violate (most lookups yield one type), so
    // it's never flagged partial — otherwise the flag would fire on ~most
    // successful calls and mean nothing.
    const foundTypes = new Set(emails.map((e) => e.type));
    const partial = requestedTypes
      ? !requestedTypes.every((t) => foundTypes.has(t))
      : false;
    return {
      ok: true,
      deliverable: buildDeliverable(result, body.linkedin_url ?? '', partial),
    };
  } catch (err) {
    if (err instanceof HttpError && err.status === 504) {
      logger.warn({ request_id: requestId }, 'x402 find_email timed out (not charged)');
      return {
        ok: false,
        status: 504,
        code: 'provider_timeout',
        message: 'Upstream email providers did not respond in time',
        retryable: true,
      };
    }
    if (err instanceof HttpError) {
      // no_leads / no_configured_providers — a caller- or config-side issue.
      return {
        ok: false,
        status: 400,
        code: 'invalid_input',
        message: err.message,
        retryable: false,
      };
    }
    logger.error({ err, request_id: requestId }, 'x402 find_email failed (not charged)');
    return {
      ok: false,
      status: 502,
      code: 'provider_error',
      message: 'Email lookup failed',
      retryable: true,
    };
  }
}

export const x402FindEmailRouter = Router();

x402FindEmailRouter.post('/x402/find-email', async (req, res) => {
  const requestId = randomUUID();

  // ── Validate input ─────────────────────────────────────────────────────
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(req.body);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? 'provide either linkedin_url OR full_name + company_domain/company_name'
        : 'invalid request body';
    sendX402Error(res, 400, {
      code: 'invalid_input',
      message,
      requestId,
      retryable: false,
    });
    return;
  }

  // ── Idempotency / dedup ────────────────────────────────────────────────
  // Key on the buyer (payer address) + request content so a retry storm for one
  // lookup collapses to a single charge. The onBeforeSettle hook
  // (integrations/x402/settlement.ts) is the authoritative guard against the
  // second charge; here we avoid re-spending providers (deliverable cache +
  // in-flight lock) and report `charged` honestly.
  //
  // LOCKSTEP: the inputs extracted below (Idempotency-Key header, payer from
  // the payment header, raw body, req.path) must match what
  // keyFromSettleContext in settlement.ts extracts from the settle context.
  // If either side changes, change both — otherwise deliverables cache under
  // one key while settlements mark another, and the double-charge guard
  // silently stops matching.
  const auth = parsePaymentAuth(
    req.header('x-payment') ?? req.header('payment-signature'),
  );
  const dedupeKey = deriveDedupeKey({
    idempotencyKey:
      req.header('Idempotency-Key') ?? req.header('idempotency-key') ?? null,
    payer: auth?.from ?? null,
    body: req.body,
    route: req.path,
  });

  if (dedupeKey) {
    const cached = idempotency.getDeliverable(dedupeKey);
    if (cached) {
      // Already settled → this retry is a free duplicate (the hook will skip
      // its charge). Not yet settled → this request is the one that gets charged.
      const alreadyCharged = idempotency.isSettled(dedupeKey);
      logger.info(
        { request_id: requestId, dedupe_key: dedupeKey, already_charged: alreadyCharged },
        'x402 find_email served from idempotency cache (no provider spend)',
      );
      res.status(200).json({
        ...cached,
        requestId,
        charged: !alreadyCharged,
        duplicate: alreadyCharged,
      });
      return;
    }
  }

  // ── Run (or join) the lookup ───────────────────────────────────────────
  let outcome: LookupOutcome;
  if (dedupeKey) {
    const pending = idempotency.getInFlight(dedupeKey);
    if (pending) {
      logger.info(
        { request_id: requestId, dedupe_key: dedupeKey },
        'x402 find_email joined in-flight duplicate (no provider spend)',
      );
      outcome = await pending;
    } else {
      const run = performLookup(body, requestId);
      idempotency.setInFlight(dedupeKey, run);
      outcome = await run;
      // Cache BEFORE clearing the lock so there's no window where a new
      // arrival misses both and starts a fresh provider run. Both calls are
      // synchronous, so nothing can interleave between them.
      if (outcome.ok) idempotency.cacheDeliverable(dedupeKey, outcome.deliverable);
      idempotency.clearInFlight(dedupeKey);
    }
  } else {
    // No payment header and no Idempotency-Key (can't happen behind the
    // payment middleware) — run without dedup.
    outcome = await performLookup(body, requestId);
  }

  // ── Respond ────────────────────────────────────────────────────────────
  if (!outcome.ok) {
    sendX402Error(res, outcome.status, {
      code: outcome.code,
      message: outcome.message,
      requestId,
      retryable: outcome.retryable,
      providersAttempted: outcome.providersAttempted,
    });
    return;
  }

  const alreadyCharged = dedupeKey ? idempotency.isSettled(dedupeKey) : false;
  logger.info(
    {
      request_id: requestId,
      linkedin_url: body.linkedin_url,
      emails_found: outcome.deliverable.emails.length,
      partial: outcome.deliverable.partial,
      already_charged: alreadyCharged,
    },
    'x402 find_email fulfilled',
  );
  res.status(200).json({
    ...outcome.deliverable,
    requestId,
    charged: !alreadyCharged,
    duplicate: alreadyCharged,
  });
});
