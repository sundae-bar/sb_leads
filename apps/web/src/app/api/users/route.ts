import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthProvider } from '@/lib/auth';
import type { TenantMemberResponse } from '@/types';

export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // List all members of the current tenant with their profile info.
  const { data: members, error } = await admin
    .from('tenant_members')
    .select('id, user_id, tenant_id, role, profiles(id, full_name, avatar_url)')
    .eq('tenant_id', user.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails from auth.users via admin API.
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailMap = new Map(authUsers.users.map((u) => [u.id, u.email ?? '']));

  const response: TenantMemberResponse[] = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      userId: m.user_id,
      tenantId: m.tenant_id,
      role: m.role as 'owner' | 'admin' | 'member',
      fullName: profile?.full_name ?? null,
      email: emailMap.get(m.user_id) ?? '',
      avatarUrl: profile?.avatar_url ?? null,
    };
  });

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only owner/admin can invite.
  if (user.tenantRole === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const admin = createAdminClient();

  // Invite the user (creates auth.users row and sends email).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Add them to this tenant immediately.
  await admin
    .from('tenant_members')
    .upsert({ tenant_id: user.tenantId, user_id: data.user.id, role: 'member' });

  return NextResponse.json({ id: data.user.id, email: data.user.email }, { status: 201 });
}
