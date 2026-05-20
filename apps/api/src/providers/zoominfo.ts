import { ProviderError } from './types.js';
import type {
  EmailFinder,
  EmailVerifier,
  FindEmailsInput,
  FindEmailsOutput,
  IntentInput,
  IntentOutput,
  IntentProvider,
  VerifyOutput,
} from './types.js';

// TODO: implement ZoomInfo integration.
// Docs: https://api-docs.zoominfo.com/
// API key env: ZOOMINFO_API_KEY (config.ts)
// Capabilities to wire when we get to it:
//   - Contact Search (by name + company)
//   - Contact Enrich (by linkedin_url, email, or zoominfo id)
//   - Company Intent / Scoops API (high-value but premium tier)
//
// Stub: throws not_implemented. Filtered out of the default chain by
// `isProviderConfigured` while ZOOMINFO_API_KEY is unset.

const PROVIDER = 'zoominfo' as const;

const notImplemented = (action: string): never => {
  throw new ProviderError(PROVIDER, `${action} not implemented yet`);
};

export const zoominfoFinder: EmailFinder = {
  name: PROVIDER,
  async findEmails(_input: FindEmailsInput): Promise<FindEmailsOutput> {
    return notImplemented('findEmails');
  },
};

export const zoominfoVerifier: EmailVerifier = {
  name: PROVIDER,
  async verifyEmail(_email: string): Promise<VerifyOutput> {
    return notImplemented('verifyEmail');
  },
};

export const zoominfoIntent: IntentProvider = {
  name: PROVIDER,
  async getCompanyIntent(_input: IntentInput): Promise<IntentOutput> {
    return notImplemented('getCompanyIntent');
  },
};
