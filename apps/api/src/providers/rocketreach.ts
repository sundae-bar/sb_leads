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

// TODO: implement RocketReach integration.
// Docs: https://rocketreach.co/api
// API key env: ROCKETREACH_API_KEY (config.ts)
// Capabilities to wire when we get to it:
//   - Person Lookup by linkedin_url, by name + company, or by email
//   - Bulk lookups for batch enrichment
//
// Stub: throws not_implemented. Filtered out of the default chain by
// `isProviderConfigured` while ROCKETREACH_API_KEY is unset.

const PROVIDER = 'rocketreach' as const;

const notImplemented = (action: string): never => {
  throw new ProviderError(PROVIDER, `${action} not implemented yet`);
};

export const rocketreachFinder: EmailFinder = {
  name: PROVIDER,
  async findEmails(_input: FindEmailsInput): Promise<FindEmailsOutput> {
    return notImplemented('findEmails');
  },
};

export const rocketreachVerifier: EmailVerifier = {
  name: PROVIDER,
  async verifyEmail(_email: string): Promise<VerifyOutput> {
    return notImplemented('verifyEmail');
  },
};

export const rocketreachIntent: IntentProvider = {
  name: PROVIDER,
  async getCompanyIntent(_input: IntentInput): Promise<IntentOutput> {
    return notImplemented('getCompanyIntent');
  },
};
