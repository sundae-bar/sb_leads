// Settlement hooks for the x402 resource server — the authoritative
// double-charge guard.
//
// `onBeforeSettle` runs right before funds move for every verified payment. If
// we've already settled this (payer + request), we SKIP the real settlement and
// return a synthetic success, so the buyer still gets their 200 + data without
// paying twice. Otherwise we mark the key and allow the real settlement.
//
// This is the hard guarantee against the retry double-charge (the handler's
// cache is only a provider-spend optimization). `onSettleFailure` un-marks the
// key if the real settlement fails, so a genuinely-failed payment's retry is
// charged properly instead of being served free as a "duplicate".
import type { BeforeSettleHook, OnSettleFailureHook, SettleContext } from '@x402/core/server';
import { logger } from '../../logger.js';
import { deriveDedupeKey, idempotency } from './idempotency.js';

/** Recompute the dedup key from a settlement context — mirrors the handler. */
function keyFromSettleContext(ctx: SettleContext): string | null {
  try {
    const payer = payerOf(ctx);
    const tc = ctx.transportContext as
      | {
          request?: {
            path?: unknown;
            adapter?: {
              getHeader?(name: string): string | undefined;
              getBody?(): unknown;
            };
          };
        }
      | undefined;
    const adapter = tc?.request?.adapter;
    // Same `req.path` the handler hashed. If a library upgrade ever drops it
    // from the transport context, fail to null (no dedup, every payment
    // settles) rather than derive a key that can't match the handler's.
    const route = tc?.request?.path;
    if (typeof route !== 'string' || !route) return null;
    const idempotencyKey =
      adapter?.getHeader?.('Idempotency-Key') ??
      adapter?.getHeader?.('idempotency-key') ??
      null;
    const body = adapter?.getBody?.() ?? {};
    return deriveDedupeKey({ idempotencyKey, payer, body, route });
  } catch {
    return null;
  }
}

function payerOf(ctx: SettleContext): string | undefined {
  const auth = (ctx.paymentPayload as { payload?: { authorization?: { from?: unknown } } })
    ?.payload?.authorization;
  return typeof auth?.from === 'string' ? auth.from : undefined;
}

export const dedupeBeforeSettle: BeforeSettleHook = async (ctx) => {
  const key = keyFromSettleContext(ctx);
  if (!key) return; // can't key it → never block a legitimate charge

  if (idempotency.isSettled(key)) {
    logger.info(
      { key },
      'x402 duplicate payment — skipping settlement (buyer not charged)',
    );
    return {
      skip: true,
      result: {
        success: true,
        transaction: '', // no on-chain settlement occurred
        network: ctx.requirements.network,
        payer: payerOf(ctx),
        extra: { skipped: 'duplicate_request' },
      },
    };
  }

  idempotency.markSettled(key);
  return; // allow the real settlement
};

export const dedupeOnSettleFailure: OnSettleFailureHook = async (ctx) => {
  const key = keyFromSettleContext(ctx);
  if (key) idempotency.unmarkSettled(key);
  return;
};
