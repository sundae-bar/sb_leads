import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthProvider } from '@/lib/auth';

/**
 * POST /api/admin/switch-tenant — set the active tenant for a super admin.
 * Updates the user's app_metadata.active_tenant_id and signals the client to
 * refresh its session so the new claim lands in the JWT.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const tenantId: string | undefined = body.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .single();
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Pull existing app_metadata so we don't clobber other claims.
  const { data: authUser } = await admin.auth.admin.getUserById(user.id);
  const existingMeta = authUser.user?.app_metadata ?? {};

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...existingMeta, active_tenant_id: tenantId },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, refreshSession: true });
}

/**
 * DELETE /api/admin/switch-tenant — return the super admin to their first
 * membership tenant.
 */
export async function DELETE() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: firstMembership } = await admin
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!firstMembership) {
    return NextResponse.json({ error: 'No memberships' }, { status: 400 });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(user.id);
  const existingMeta = authUser.user?.app_metadata ?? {};

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...existingMeta, active_tenant_id: firstMembership.tenant_id },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, refreshSession: true });
}
