export type ProviderName = 'aleads' | 'apollo' | 'nymeria' | 'contactout' | 'hunterio';

export type EmailType = 'work' | 'personal';

export interface NormalizedEmail {
  address: string;
  type: EmailType;
  verified: boolean;
  verification_status?: string;
  confidence?: number;
  source_provider: ProviderName;
  verified_by?: ProviderName | null;
}

export interface Person {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  title?: string;
  location?: string;
  linkedin_url?: string;
}

export interface Company {
  name?: string;
  domain?: string;
  industry?: string;
  linkedin_url?: string;
}

export interface IntentSignal {
  type: string;
  value?: string | number | boolean;
  description?: string;
  date?: string;
  url?: string;
  snippet?: string;
  source_provider: ProviderName;
}

export interface ProviderAttempt {
  provider: ProviderName;
  found: boolean;
  error: string | null;
}

export interface FindEmailResult {
  linkedin_url: string;
  emails: NormalizedEmail[];
  person?: Person;
  company?: Company;
  providers_attempted: ProviderAttempt[];
  credits_used: number;
  /** Tenant's remaining credits after this call (refunded if no emails found). */
  credits_remaining?: number;
}

export interface VerifyEmailResult {
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
  source_provider: ProviderName;
  credits_used: number;
}

export interface IntentSignalsResult {
  company: Company;
  signals: IntentSignal[];
  providers_attempted: ProviderAttempt[];
  credits_used: number;
}

export interface FindEmailHints {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company_domain?: string;
  document_id?: string;
}

export type HintsByUrl = Partial<Record<string, FindEmailHints>>;
