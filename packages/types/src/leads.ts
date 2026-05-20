export type ProviderName =
  // Real, wired-up providers — see apps/api/src/providers/*.ts.
  | 'aleads'
  | 'apollo'
  | 'nymeria'
  | 'contactout'
  | 'hunterio'
  // Stubbed providers — every logo on the marketing cloud has a backing
  // module so the union stays exhaustive across the codebase, but the
  // implementations throw "not implemented yet". `isProviderConfigured`
  // filters them out of the default chain (no env var → never invoked).
  | 'peopledatalabs'
  | 'snov'
  | 'lusha'
  | 'rocketreach'
  | 'zoominfo';

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
  /**
   * The LinkedIn URL for the lead. Required for URL-mode queries; may be
   * empty for name-mode queries when the provider didn't return one (in
   * which case the result is shown but NOT persisted — `contacts` is keyed
   * by `(tenant_id, linkedin_url)` and we don't synthesise URLs).
   */
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
  /**
   * Free-text company name. Use when a domain isn't known — providers that
   * accept an organisation name (Apollo `/people/match`, Nymeria) can take
   * this directly; others will need a domain resolved upstream.
   */
  company_name?: string;
  document_id?: string;
}

export type HintsByUrl = Partial<Record<string, FindEmailHints>>;

/**
 * What the service + provider layer index a lookup by. URL-mode is the
 * original path; name-mode is the new "Aran McKenna at Cykel" case. Each
 * provider's `findEmails` receives a `LeadIdentifier[]` and decides which
 * upstream endpoint to call based on `kind`.
 *
 * For name queries, at least one of `company_domain` / `company_name` must
 * be present — validated at the entry point (MCP / REST / the402).
 */
export type LeadIdentifier =
  | { kind: 'linkedin'; linkedin_url: string }
  | {
      kind: 'name';
      full_name: string;
      first_name?: string;
      last_name?: string;
      company_domain?: string;
      company_name?: string;
    };

/** Convenience alias for callers that build name-only queries. */
export type NameQuery = Extract<LeadIdentifier, { kind: 'name' }>;

/**
 * Canonicalise a LinkedIn URL so duplicates merge in the `contacts` table
 * and the leads view doesn't show "http://www.linkedin.com/in/x" alongside
 * "https://linkedin.com/in/x".
 *
 * Transformations:
 *   - Force `https://` (drops http://, mixed-case schemes, missing scheme).
 *   - Drop the leading `www.` and any country/locale subdomain like
 *     `uk.linkedin.com`, `de.linkedin.com` → all become `linkedin.com`.
 *   - Strip trailing slashes, query strings, and fragments (`?trk=…` etc.).
 *   - Lowercase the path (LinkedIn handles are case-insensitive; the
 *     canonical form on linkedin.com is lowercase).
 *   - Accept a bare handle ("chestermano") and expand it to
 *     `https://linkedin.com/in/chestermano` — providers and agents sometimes
 *     pass handles by mistake; better to canonicalise than store junk.
 *
 * Non-LinkedIn URLs and unparseable input fall through unchanged so we
 * never corrupt data we don't recognise.
 */
export function normalizeLinkedinUrl(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  if (!trimmed) return input;

  // Bare handle (no slash, no dot) — treat as a /in/ handle.
  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return `https://linkedin.com/in/${trimmed.toLowerCase()}`;
  }

  // Pad with https:// if the protocol is missing so URL parsing works.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return input;
  }

  const host = parsed.hostname.toLowerCase();
  // Only collapse hosts that look like linkedin.com or <region>.linkedin.com.
  // Anything else is left alone (e.g. someone pasted a non-LinkedIn URL).
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
    return input;
  }

  // Drop trailing slash(es) + path-case-fold. Keep the path structure intact.
  const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
  return `https://linkedin.com${path}`;
}

/**
 * Stable, lowercase key used to merge waterfall results from multiple
 * providers onto the same lead.
 *
 * - URL-mode: the normalised URL (so http/https + www variants don't split).
 * - Name-mode: `name:<full_name>@<domain|company>` — domain preferred over
 *   company name because that's what providers actually match against.
 *
 * Lives here (not in apps/api) so providers and the service layer can both
 * import it without forming a circular dependency through the registry.
 */
export function leadKey(lead: LeadIdentifier): string {
  if (lead.kind === 'linkedin') return normalizeLinkedinUrl(lead.linkedin_url);
  const name = lead.full_name.trim().toLowerCase();
  const where = (lead.company_domain ?? lead.company_name ?? '').trim().toLowerCase();
  return `name:${name}@${where}`;
}
