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

// TODO: implement People Data Labs integration.
// Docs: https://docs.peopledatalabs.com/
// API key env: PEOPLEDATALABS_API_KEY (config.ts)
// Capabilities to wire when we get to it:
//   - Email finder by linkedin_url (Person Enrichment API)
//   - Email finder by name + company / domain
//   - Company intent / firmographics (Company Enrichment API)
//
// Until implemented, every method throws. The service-layer try/catch in
// `findEmail.ts` catches the throw, records a failed ProviderAttempt with
// the error, and continues the waterfall. So the stub is safe: it can sit
// in the registry without breaking calls.
//
// `isProviderConfigured('peopledatalabs')` returns false when the env var
// is unset (the default), so this provider never even gets attempted unless
// a caller explicitly opts in. The registry references it for type
// completeness + so the marketing-cloud logo isn't orphaned.

const PROVIDER = 'peopledatalabs' as const;

const notImplemented = (action: string): never => {
  throw new ProviderError(PROVIDER, `${action} not implemented yet`);
};

export const peopledatalabsFinder: EmailFinder = {
  name: PROVIDER,
  async findEmails(_input: FindEmailsInput): Promise<FindEmailsOutput> {
    return notImplemented('findEmails');
  },
};

export const peopledatalabsVerifier: EmailVerifier = {
  name: PROVIDER,
  async verifyEmail(_email: string): Promise<VerifyOutput> {
    return notImplemented('verifyEmail');
  },
};

export const peopledatalabsIntent: IntentProvider = {
  name: PROVIDER,
  async getCompanyIntent(_input: IntentInput): Promise<IntentOutput> {
    return notImplemented('getCompanyIntent');
  },
};
