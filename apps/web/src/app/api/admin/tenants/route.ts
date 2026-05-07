import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthProvider } from '@/lib/auth';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** GET /api/admin/tenants — list all tenants (super admin only). */
export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await createAdminClient()
    .from('tenants')
    .select('id, name, slug')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/admin/tenants — provision a new tenant (super admin only). */
export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const tenantName = (body.tenantName ?? '').trim();
  const ownerEmail: string | undefined = body.ownerEmail;

  if (!tenantName) return NextResponse.json({ error: 'tenantName is required' }, { status: 400 });

  const db = createAdminClient();

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
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }

  // Optionally invite an owner.
  if (ownerEmail) {
    const { data: invited } = await db.auth.admin.inviteUserByEmail(ownerEmail);
    if (invited?.user) {
      await db
        .from('tenant_members')
        .insert({ tenant_id: tenant.id, user_id: invited.user.id, role: 'owner' });
    }
  }

  return NextResponse.json({ id: tenant.id, name: tenant.name, slug: tenant.slug }, { status: 201 });
}
