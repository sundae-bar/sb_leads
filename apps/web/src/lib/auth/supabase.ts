import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { AuthProvider, AuthUser } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const COOKIE_NAME = 'sb-scoop';

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Look up a user's role within a tenant. JWT claim is the source of truth for
// tenantId; this is just to fetch the role for UI/authorization.
async function membershipRole(
  userId: string,
  tenantId: string,
): Promise<'owner' | 'admin' | 'member' | null> {
  const { data } = await adminClient()
    .from('tenant_members')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single();
  return (data?.role as 'owner' | 'admin' | 'member' | undefined) ?? null;
}

export class SupabaseAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookieOptions: { name: COOKIE_NAME },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* Server Component */
          }
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const tenantId = (user.app_metadata as { active_tenant_id?: string } | null)?.active_tenant_id;
    if (!tenantId) return null;

    const role = await membershipRole(user.id, tenantId);
    if (!role) return null; // JWT claim references a tenant the user is no longer in.

    const { data: profile } = await adminClient()
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? '',
      tenantId,
      tenantRole: role,
      isSuperAdmin: profile?.is_super_admin ?? false,
    };
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const tenantId = (user.app_metadata as { active_tenant_id?: string } | null)?.active_tenant_id;
    if (!tenantId) return null;

    const role = await membershipRole(user.id, tenantId);
    if (!role) return null;

    const { data: profile } = await adminClient()
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? '',
      tenantId,
      tenantRole: role,
      isSuperAdmin: profile?.is_super_admin ?? false,
    };
  }
}
