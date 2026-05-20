import type { ProviderName } from "../config.js";
import type {
  Company,
  EmailType,
  HintsByUrl,
  IntentSignal,
  LeadIdentifier,
  NormalizedEmail,
  Person,
} from "@scoop/types";

/**
 * What providers receive. `leads` is the new canonical input — a mixed list
 * of URL-mode and name-mode queries. Each provider decides per lead which
 * upstream endpoint to call based on `lead.kind`.
 *
 * Providers index their per-lead results by a stable string key (the URL
 * for `kind: 'linkedin'`, a `name:<full_name>@<domain|company>` key for
 * `kind: 'name'`). The service layer reuses the same keying to merge
 * results across the waterfall — see `leadKey()` in services/findEmail.ts.
 */
export interface FindEmailsInput {
  leads: LeadIdentifier[];
  email_types: EmailType[];
  hints?: HintsByUrl;
}

export interface PerUrlFinderResult {
  /**
   * Stable key the service uses to merge this result with other waterfall
   * hits. For URL-mode this is the input LinkedIn URL; for name-mode it's
   * the synthesised `name:<full_name>@<domain|company>` key.
   */
  lead_key: string;
  /**
   * The LinkedIn URL for the resolved person. Always set when the input
   * was URL-mode. For name-mode it may be empty if the provider didn't
   * return one — the service falls through to the next provider, and the
   * final result is shown but NOT persisted (contacts is URL-keyed).
   */
  linkedin_url: string;
  emails: NormalizedEmail[];
  person?: Person;
  company?: Company;
}

export interface FindEmailsOutput {
  results: PerUrlFinderResult[];
  credits_used: number;
}

export interface EmailFinder {
  name: ProviderName;
  findEmails(input: FindEmailsInput): Promise<FindEmailsOutput>;
}

export interface VerifyOutput {
  email: string;
  valid: boolean;
  status: string;
  score?: number;
  checks?: {
    mx?: boolean;
    smtp?: boolean;
    disposable?: boolean;
    webmail?: boolean;
    accept_all?: boolean;
  };
  credits_used: number;
}

export interface EmailVerifier {
  name: ProviderName;
  verifyEmail(email: string): Promise<VerifyOutput>;
}

export interface IntentInput {
  linkedin_url?: string;
  company_domain?: string;
  company_name?: string;
}

export interface IntentOutput {
  company: Company;
  signals: IntentSignal[];
  credits_used: number;
}

export interface IntentProvider {
  name: ProviderName;
  getCompanyIntent(input: IntentInput): Promise<IntentOutput>;
}

export class ProviderError extends Error {
  constructor(
    public provider: ProviderName,
    message: string,
    public override cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
  }
}
