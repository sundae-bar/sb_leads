// Structured response shapes for the paid x402 endpoint (POST /x402/find-email).
//
// The HTTP status IS the billing signal: @x402/express settles only on a 2xx
// and cancels on any >=400 (verified against the installed 2.12.0 middleware).
// So every error helper here writes a >=400 status and reports `charged:false`,
// which is therefore always accurate — a cancelled authorization moves no funds.
import type { Response } from 'express';
import type { FindEmailResult } from '@scoop/types';

// Stable, machine-parseable error codes. Clients branch on these. (Duplicates
// are NOT an error — they return 200 with the cached deliverable; see
// idempotency.ts.)
export type X402ErrorCode =
  | 'invalid_input'
  | 'no_email_found'
  | 'provider_timeout'
  | 'provider_error'
  | 'internal_error';

export interface X402Deliverable {
  linkedin_url: string;
  emails: FindEmailResult['emails'];
  person: FindEmailResult['person'] | null;
  company: FindEmailResult['company'] | null;
  providers_attempted: FindEmailResult['providers_attempted'];
  /** True when some — but not all — requested email types were found. */
  partial: boolean;
  /**
   * Whether this response settled a payment. True for a fresh success; false
   * when served from the idempotency cache as a duplicate (the buyer already
   * paid for it). The `X-PAYMENT-RESPONSE` header is the authoritative record
   * of on-chain settlement.
   */
  charged: boolean;
  /** True when this is a cached replay of an already-paid request. */
  duplicate?: boolean;
  requestId: string;
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
 * Build the success deliverable (200 → settles). `partial` reflects whether
 * some-but-not-all requested email types were found.
 */
export function buildDeliverable(
  result: FindEmailResult | undefined,
  fallbackLinkedinUrl: string,
  requestId: string,
  partial: boolean,
): X402Deliverable {
  return {
    linkedin_url: result?.linkedin_url || fallbackLinkedinUrl || '',
    emails: result?.emails ?? [],
    person: result?.person ?? null,
    company: result?.company ?? null,
    providers_attempted: result?.providers_attempted ?? [],
    partial,
    charged: true,
    requestId,
  };
}
