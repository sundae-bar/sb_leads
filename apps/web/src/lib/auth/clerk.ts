/**
 * Clerk auth provider stub.
 *
 * To activate:
 *   1. Set AUTH_PROVIDER=clerk in your env files
 *   2. Install: pnpm add @clerk/nextjs @clerk/backend
 *   3. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to your env
 *   4. Wrap your root layout with <ClerkProvider>
 *   5. Implement the methods below using Clerk's server SDK
 *
 * When using Clerk, Supabase is used as DB only (service role key, no RLS).
 * All queries must include explicit .eq('tenant_id', tenantId) filters.
 */

import type { AuthProvider, AuthUser } from './types';

export class ClerkAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    // TODO: implement with Clerk
    // import { auth } from '@clerk/nextjs/server';
    // const { userId } = await auth();
    // if (!userId) return null;
    // resolve tenant from tenant_members using service role Supabase client
    throw new Error('ClerkAuthProvider not yet implemented. See apps/web/src/lib/auth/clerk.ts');
  }

  async verifyToken(_token: string): Promise<AuthUser | null> {
    // TODO: implement with Clerk
    // import { verifyToken } from '@clerk/backend';
    // const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    // resolve tenant from tenant_members using service role Supabase client
    throw new Error('ClerkAuthProvider not yet implemented. See apps/web/src/lib/auth/clerk.ts');
  }
}
