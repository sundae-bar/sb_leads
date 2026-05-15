// Tenant-scoped contacts persistence used by the MCP find_email tool.
// Mirrors the merge semantics in the web's POST /api/contacts handler so
// the dashboard and the chat agent share a single source of truth for what
// "the user's contacts" means.
import { adminDb } from '../admin.js';
import {
  type FindEmailResult,
  type NormalizedEmail,
  type ProviderAttempt,
  mergeEmails,
  mergeProviderAttempts,
} from '@scoop/types';

/**
 * Upsert a FindEmailResult into the tenant's contacts table, merging with any
 * existing row for the same linkedin_url. Safe to call regardless of whether
 * the lead has been seen before.
 */
export async function persistContact(
  tenantId: string,
  result: FindEmailResult,
): Promise<void> {
  const { data: existing } = await adminDb
    .from('contacts')
    .select('emails, providers_attempted, credits_used, person, company')
    .eq('tenant_id', tenantId)
    .eq('linkedin_url', result.linkedin_url)
    .maybeSingle();

  const merged = existing
    ? {
        emails: mergeEmails(
          (existing.emails ?? []) as NormalizedEmail[],
          result.emails,
        ),
        providers_attempted: mergeProviderAttempts(
          (existing.providers_attempted ?? []) as ProviderAttempt[],
          result.providers_attempted,
        ),
        credits_used:
          ((existing.credits_used ?? 0) as number) + (result.credits_used ?? 0),
        person:
          (existing.person as FindEmailResult['person']) ?? result.person ?? null,
        company:
          (existing.company as FindEmailResult['company']) ?? result.company ?? null,
      }
    : {
        emails: result.emails,
        providers_attempted: result.providers_attempted,
        credits_used: result.credits_used,
        person: result.person ?? null,
        company: result.company ?? null,
      };

  const { error } = await adminDb.from('contacts').upsert(
    {
      tenant_id: tenantId,
      linkedin_url: result.linkedin_url,
      ...merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,linkedin_url' },
  );

  if (error) {
    throw new Error(`persistContact failed: ${error.message}`);
  }
}
