import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@scoop/types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const admin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

export async function POST(request: NextRequest) {
  // Verify the caller is authenticated.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tenantName = (body.tenantName ?? '').trim();
  if (!tenantName) {
    return NextResponse.json({ error: 'tenantName is required' }, { status: 400 });
  }

  const db = admin();

  // Guard: user already has a tenant membership.
  const { data: existing } = await db
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already in a workspace' }, { status: 409 });
  }

  // Generate a unique slug.
  const baseSlug = slugify(tenantName) || 'workspace';
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { data: taken } = await db.from('tenants').select('id').eq('slug', slug).single();
    if (!taken) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({ name: tenantName, slug })
    .select()
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }

  const { error: memberError } = await db
    .from('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });

  if (memberError) {
    return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
  }

  await db
    .from('subscriptions')
    .insert({ tenant_id: tenant.id, plan_id: 'free', credits_remaining: PLANS.free.creditsPerCycle });

  // Stamp the active tenant onto the user's JWT app_metadata so RLS sees it
  // on subsequent requests. Client must call supabase.auth.refreshSession()
  // to pick up the new claim.
  const { error: metaError } = await db.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      active_tenant_id: tenant.id,
    },
  });

  if (metaError) {
    return NextResponse.json({ error: 'Failed to set active tenant' }, { status: 500 });
  }

  return NextResponse.json(
    { tenantId: tenant.id, refreshSession: true },
    { status: 201 },
  );
}
