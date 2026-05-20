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

// TODO: implement Lusha integration.
// Docs: https://docs.lusha.com/
// API key env: LUSHA_API_KEY (config.ts)
// Capabilities to wire when we get to it:
//   - Person enrich by linkedin_url OR by name + company
//   - Company enrich (firmographics + tech stack)
//
// Stub: throws not_implemented. Filtered out of the default chain by
// `isProviderConfigured` while LUSHA_API_KEY is unset.

const PROVIDER = 'lusha' as const;

const notImplemented = (action: string): never => {
  throw new ProviderError(PROVIDER, `${action} not implemented yet`);
};

export const lushaFinder: EmailFinder = {
  name: PROVIDER,
  async findEmails(_input: FindEmailsInput): Promise<FindEmailsOutput> {
    return notImplemented('findEmails');
  },
};

export const lushaVerifier: EmailVerifier = {
  name: PROVIDER,
  async verifyEmail(_email: string): Promise<VerifyOutput> {
    return notImplemented('verifyEmail');
  },
};

export const lushaIntent: IntentProvider = {
  name: PROVIDER,
  async getCompanyIntent(_input: IntentInput): Promise<IntentOutput> {
    return notImplemented('getCompanyIntent');
  },
};
