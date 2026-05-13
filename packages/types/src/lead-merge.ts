// Pure helpers for merging FindEmailResult rows when combining the output of
// a fresh find-email call with an existing saved contact. Shared between the
// API (MCP find_email tool) and the web (POST /api/contacts) so both surfaces
// persist contacts with identical semantics.
import type { FindEmailResult, NormalizedEmail, ProviderAttempt } from './leads.js';

/** Union two email arrays, deduping by `(address, source_provider)`. New entries win on conflict. */
export function mergeEmails(
  existing: NormalizedEmail[],
  incoming: NormalizedEmail[],
): NormalizedEmail[] {
  const key = (e: NormalizedEmail) => `${e.address.toLowerCase()}::${e.source_provider}`;
  const map = new Map<string, NormalizedEmail>();
  for (const e of existing) map.set(key(e), e);
  for (const e of incoming) map.set(key(e), e);
  return Array.from(map.values());
}

/** Merge provider attempts, deduping by provider. Last write wins. */
export function mergeProviderAttempts(
  existing: ProviderAttempt[],
  incoming: ProviderAttempt[],
): ProviderAttempt[] {
  const map = new Map<string, ProviderAttempt>();
  for (const a of existing) map.set(a.provider, a);
  for (const a of incoming) map.set(a.provider, a);
  return Array.from(map.values());
}

/** Merge a freshly-found result into an existing FindEmailResult. */
export function mergeFindEmailResult(
  existing: FindEmailResult,
  incoming: FindEmailResult,
): FindEmailResult {
  return {
    linkedin_url: existing.linkedin_url,
    emails: mergeEmails(existing.emails, incoming.emails),
    providers_attempted: mergeProviderAttempts(
      existing.providers_attempted,
      incoming.providers_attempted,
    ),
    credits_used: (existing.credits_used ?? 0) + (incoming.credits_used ?? 0),
    person: existing.person ?? incoming.person,
    company: existing.company ?? incoming.company,
    credits_remaining: incoming.credits_remaining,
  };
}
