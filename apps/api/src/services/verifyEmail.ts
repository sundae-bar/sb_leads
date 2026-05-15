import type { ProviderName } from '../config.js';
import { isProviderConfigured } from '../config.js';
import { logCredit } from '../credits.js';
import { HttpError } from '../middleware/error.js';
import { DEFAULT_VERIFIER, verifiers } from '../providers/registry.js';
import type { VerifyEmailResult } from '@scoop/types';

export interface VerifyEmailOptions {
  email: string;
  provider?: ProviderName;
  request_id?: string;
  tenant_id?: string;
}

export const verifyEmail = async (
  opts: VerifyEmailOptions,
): Promise<VerifyEmailResult> => {
  const providerName = opts.provider ?? DEFAULT_VERIFIER;
  const verifier = verifiers[providerName];
  if (!verifier) {
    throw new HttpError(400, 'unsupported_verifier', { provider: providerName });
  }
  if (!isProviderConfigured(providerName)) {
    throw new HttpError(400, 'verifier_not_configured', { provider: providerName });
  }
  const out = await verifier.verifyEmail(opts.email);
  logCredit({
    provider: providerName,
    action: 'verify',
    amount: out.credits_used,
    request_id: opts.request_id,
    tenant: opts.tenant_id,
  });
  return {
    email: out.email,
    valid: out.valid,
    status: out.status,
    score: out.score,
    checks: out.checks,
    source_provider: providerName,
    credits_used: out.credits_used,
  };
};
