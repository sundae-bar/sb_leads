import type { ProviderName } from "../config.js";
import type {
  Company,
  EmailType,
  HintsByUrl,
  IntentSignal,
  NormalizedEmail,
  Person,
} from "@sundae/types";

export interface FindEmailsInput {
  linkedin_urls: string[];
  email_types: EmailType[];
  hints?: HintsByUrl;
}

export interface PerUrlFinderResult {
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
