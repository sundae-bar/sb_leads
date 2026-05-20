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

// TODO: implement Snov.io integration.
// Docs: https://snov.io/api
// API key env: SNOV_API_KEY (config.ts)
// Capabilities to wire when we get to it:
//   - Email finder by name + domain (Snov's primary API)
//   - Email verifier
//   - Domain search (for prospecting whole companies)
//
// Stub: throws not_implemented. Filtered out of the default chain by
// `isProviderConfigured` while SNOV_API_KEY is unset.

const PROVIDER = 'snov' as const;

const notImplemented = (action: string): never => {
  throw new ProviderError(PROVIDER, `${action} not implemented yet`);
};

export const snovFinder: EmailFinder = {
  name: PROVIDER,
  async findEmails(_input: FindEmailsInput): Promise<FindEmailsOutput> {
    return notImplemented('findEmails');
  },
};

export const snovVerifier: EmailVerifier = {
  name: PROVIDER,
  async verifyEmail(_email: string): Promise<VerifyOutput> {
    return notImplemented('verifyEmail');
  },
};

export const snovIntent: IntentProvider = {
  name: PROVIDER,
  async getCompanyIntent(_input: IntentInput): Promise<IntentOutput> {
    return notImplemented('getCompanyIntent');
  },
};
