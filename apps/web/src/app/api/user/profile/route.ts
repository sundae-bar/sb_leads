import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';

export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // auth.users email isn't on profiles — admin API is required.
  const admin = createAdminClient();
  const [{ data: authUser }, { data: tenant }] = await Promise.all([
    admin.auth.admin.getUserById(user.id),
    admin.from('tenants').select('name').eq('id', user.tenantId).single(),
  ]);

  return NextResponse.json({
    id: profile.id,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    email: authUser.user?.email ?? '',
    role: profile.role,
    tenantRole: user.tenantRole,
    tenantId: user.tenantId,
    tenantName: tenant?.name ?? 'Workspace',
    isSuperAdmin: user.isSuperAdmin,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.fullName !== undefined) updates.full_name = body.fullName;
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const admin = createAdminClient();
  const [{ data: authUser }, { data: tenant }] = await Promise.all([
    admin.auth.admin.getUserById(user.id),
    admin.from('tenants').select('name').eq('id', user.tenantId).single(),
  ]);

  return NextResponse.json({
    id: data.id,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    email: authUser.user?.email ?? '',
    role: data.role,
    tenantRole: user.tenantRole,
    tenantId: user.tenantId,
    tenantName: tenant?.name ?? 'Workspace',
    isSuperAdmin: user.isSuperAdmin,
  });
}
