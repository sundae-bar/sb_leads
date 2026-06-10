// Structured response shapes for the paid x402 endpoint (POST /x402/find-email).
//
// The HTTP status IS the billing signal: @x402/express settles only on a 2xx
// and cancels on any >=400 (verified against the installed 2.12.0 middleware).
// So every error helper here writes a >=400 status and reports `charged:false`,
// which is therefore always accurate — a cancelled authorization moves no funds.
import type { Response } from 'express';
import type {
  EmailType,
  FindEmailResult,
  NormalizedEmail,
  ProviderName,
} from '@scoop/types';

// Stable, machine-parseable error codes. Clients branch on these. (Duplicates
// are NOT an error — they return 200 with the cached deliverable; see
// idempotency.ts.)
export type X402ErrorCode =
  | 'invalid_input'
  | 'no_email_found'
  | 'provider_timeout'
  | 'provider_error'
  | 'internal_error';

/**
 * The cacheable deliverable payload. Billing metadata (`charged`, `duplicate`)
 * and the per-response `requestId` are deliberately NOT part of this shape —
 * the route composes them at send time, because one cached deliverable can be
 * served by responses with different billing outcomes (fresh charge vs free
 * duplicate). `charged` is best-effort under concurrency; the
 * `X-PAYMENT-RESPONSE` header is the authoritative settlement record.
 */
/**
 * One-line digest of the paid result, surfaced at the top of the body so a
 * consumer that truncates the verbose arrays can't lose the value it paid for.
 * Null only when there are no emails (which is a 404, not a deliverable).
 */
export interface X402Summary {
  best_email: string;
  type: EmailType;
  verified: boolean;
  source: ProviderName;
}

export interface X402Deliverable {
  /** Compact digest of the best email found — read this first. */
  summary: X402Summary | null;
  linkedin_url: string;
  emails: FindEmailResult['emails'];
  person: FindEmailResult['person'] | null;
  company: FindEmailResult['company'] | null;
  providers_attempted: FindEmailResult['providers_attempted'];
  /**
   * True only when the caller EXPLICITLY requested specific email types and not
   * all were found. A defaulted (work+personal) request is never partial — most
   * lookups yield a single type, so flagging those would just be noise.
   */
  partial: boolean;
}

export interface X402ErrorBody {
  error: { code: X402ErrorCode; message: string };
  /** A >=400 status cancels the authorization, so no funds ever moved. */
  charged: false;
  settlementTx: null;
  requestId: string;
  /** Whether retrying (with a fresh payment) might succeed. */
  retryable: boolean;
  /** Present on no_email_found so callers see which providers were tried. */
  providers_attempted?: FindEmailResult['providers_attempted'];
}

/**
 * The result of one provider-waterfall run, shared between the request that
 * started it and any concurrent duplicates joined to it via the in-flight lock
 * (see idempotency.ts). Failures are VALUES here, not exceptions — waiters
 * sharing the promise must never see an unhandled rejection.
 */
export type LookupOutcome =
  | { ok: true; deliverable: X402Deliverable }
  | {
      ok: false;
      status: number;
      code: X402ErrorCode;
      message: string;
      retryable: boolean;
      providersAttempted?: FindEmailResult['providers_attempted'];
    };

interface SendErrorArgs {
  code: X402ErrorCode;
  message: string;
  requestId: string;
  retryable: boolean;
  providersAttempted?: FindEmailResult['providers_attempted'];
}

/**
 * Write a structured x402 error. The `status` must be >=400 so the payment
 * middleware cancels the authorization instead of settling it — that is what
 * makes `charged:false` true.
 */
export function sendX402Error(
  res: Response,
  status: number,
  args: SendErrorArgs,
): void {
  const body: X402ErrorBody = {
    error: { code: args.code, message: args.message },
    charged: false,
    settlementTx: null,
    requestId: args.requestId,
    retryable: args.retryable,
    ...(args.providersAttempted
      ? { providers_attempted: args.providersAttempted }
      : {}),
  };
  res.status(status).json(body);
}

/**
 * Pick the single best email to surface in `summary`. Verified beats
 * unverified, work beats personal, then higher provider confidence — in strict
 * tiers so a lower tier can't overtake a higher one (confidence is clamped to
 * 0..1 as a tiebreak only).
 */
function pickBestEmail(emails: NormalizedEmail[]): NormalizedEmail | null {
  let best: NormalizedEmail | null = null;
  let bestRank = -1;
  for (const e of emails) {
    const rank =
      (e.verified ? 4 : 0) +
      (e.type === 'work' ? 2 : 0) +
      Math.min(Math.max(e.confidence ?? 0, 0), 1);
    if (rank > bestRank) {
      best = e;
      bestRank = rank;
    }
  }
  return best;
}

/**
 * Build the success deliverable (200 → settles). `partial` is supplied by the
 * caller (true only when explicitly-requested types weren't all found).
 */
export function buildDeliverable(
  result: FindEmailResult | undefined,
  fallbackLinkedinUrl: string,
  partial: boolean,
): X402Deliverable {
  const emails = result?.emails ?? [];
  const best = pickBestEmail(emails);
  return {
    summary: best
      ? {
          best_email: best.address,
          type: best.type,
          verified: best.verified,
          source: best.source_provider,
        }
      : null,
    linkedin_url: result?.linkedin_url || fallbackLinkedinUrl || '',
    emails,
    person: result?.person ?? null,
    company: result?.company ?? null,
    providers_attempted: result?.providers_attempted ?? [],
    partial,
  };
}
