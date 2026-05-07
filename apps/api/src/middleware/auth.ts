import type { Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { adminDb } from '../db/admin.js';
import { createUserClient } from '../db/factory.js';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  tenantRole: 'owner' | 'admin' | 'member';
  isSuperAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthUser;
      supabase: SupabaseClient;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

// Anon-key client used solely for verifying caller-supplied JWTs.
const verifier = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: WebSocket as any },
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  verifier.auth
    .getUser(token)
    .then(async ({ data: { user }, error }) => {
      if (error || !user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const tenantId = (user.app_metadata as { active_tenant_id?: string } | null)
        ?.active_tenant_id;
      if (!tenantId) {
        res.status(403).json({ error: 'No active tenant — complete onboarding' });
        return;
      }

      // Validate the JWT-claimed tenant against real membership and pick up the role.
      // If the claim is stale (user removed from tenant) this fails closed.
      const { data: membership } = await adminDb
        .from('tenant_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .single();

      if (!membership) {
        res.status(403).json({ error: 'Active tenant is no longer valid' });
        return;
      }

      const { data: profile } = await adminDb
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email ?? '',
        tenantId,
        tenantRole: membership.role as 'owner' | 'admin' | 'member',
        isSuperAdmin: profile?.is_super_admin ?? false,
      };
      req.supabase = createUserClient(token);
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}
