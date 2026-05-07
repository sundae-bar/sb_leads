import type { ProviderName } from '../config.js';
import { isProviderConfigured } from '../config.js';
import { logCredit } from '../credits.js';
import { logger } from '../logger.js';
import { HttpError } from '../middleware/error.js';
import {
  DEFAULT_INTENT_CHAIN,
  intentProviders,
} from '../providers/registry.js';
import type {
  Company,
  IntentSignal,
  IntentSignalsResult,
  ProviderAttempt,
} from '@sundae/types';

export interface IntentOptions {
  linkedin_url?: string;
  company_domain?: string;
  company_name?: string;
  providers?: ProviderName[];
  request_id?: string;
  tenant_id?: string;
}

export const getIntentSignals = async (
  opts: IntentOptions,
): Promise<IntentSignalsResult> => {
  if (!opts.linkedin_url && !opts.company_domain) {
    throw new HttpError(400, 'missing_input', {
      hint: 'provide linkedin_url or company_domain',
    });
  }
  const chain = (opts.providers ?? DEFAULT_INTENT_CHAIN).filter((p) => {
    if (!intentProviders[p]) return false;
    if (!isProviderConfigured(p)) {
      logger.warn({ provider: p }, 'skipping intent provider — not configured');
      return false;
    }
    return true;
  });

  const attempts: ProviderAttempt[] = [];
  const signals: IntentSignal[] = [];
  let company: Company = {
    name: opts.company_name,
    domain: opts.company_domain,
  };
  let creditsTotal = 0;

  for (const name of chain) {
    const provider = intentProviders[name]!;
    try {
      const out = await provider.getCompanyIntent({
        linkedin_url: opts.linkedin_url,
        company_domain: company.domain ?? opts.company_domain,
        company_name: company.name ?? opts.company_name,
      });
      logCredit({
        provider: name,
        action: 'intent',
        amount: out.credits_used,
        request_id: opts.request_id,
        tenant: opts.tenant_id,
      });
      creditsTotal += out.credits_used;
      attempts.push({ provider: name, found: out.signals.length > 0, error: null });
      signals.push(...out.signals);
      company = {
        name: company.name ?? out.company.name,
        domain: company.domain ?? out.company.domain,
        industry: company.industry ?? out.company.industry,
        linkedin_url: company.linkedin_url ?? out.company.linkedin_url,
      };
    } catch (err) {
      logger.warn({ err, provider: name }, 'intent provider failed');
      attempts.push({
        provider: name,
        found: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    company,
    signals,
    providers_attempted: attempts,
    credits_used: creditsTotal,
  };
};
