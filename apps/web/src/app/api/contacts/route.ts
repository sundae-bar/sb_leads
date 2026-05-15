import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';
import {
  type FindEmailResult,
  type NormalizedEmail,
  type ProviderAttempt,
  mergeEmails,
  mergeProviderAttempts,
} from '@scoop/types';

export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('linkedin_url, person, company, emails, providers_attempted, credits_used')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((row) => ({
      linkedin_url: row.linkedin_url as string,
      emails: (row.emails ?? []) as FindEmailResult['emails'],
      person: row.person as FindEmailResult['person'],
      company: row.company as FindEmailResult['company'],
      providers_attempted: (row.providers_attempted ?? []) as FindEmailResult['providers_attempted'],
      credits_used: (row.credits_used ?? 0) as number,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = (await request.json()) as FindEmailResult;
  const supabase = await createClient();

  // Read the existing row (RLS-scoped) so we can merge instead of replace.
  // This is what makes per-provider top-ups safe — we never wipe other
  // providers' emails when fetching a single one.
  const { data: existing } = await supabase
    .from('contacts')
    .select('emails, providers_attempted, credits_used, person, company')
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
        // Prefer existing person/company fields; fall back to the new result.
        person: (existing.person as FindEmailResult['person']) ?? result.person ?? null,
        company: (existing.company as FindEmailResult['company']) ?? result.company ?? null,
      }
    : {
        emails: result.emails,
        providers_attempted: result.providers_attempted,
        credits_used: result.credits_used,
        person: result.person ?? null,
        company: result.company ?? null,
      };

  const { error } = await supabase.from('contacts').upsert(
    {
      tenant_id: user.tenantId,
      linkedin_url: result.linkedin_url,
      ...merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,linkedin_url' },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
