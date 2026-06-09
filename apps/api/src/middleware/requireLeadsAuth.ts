import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { adminDb } from '../db/admin.js';
import type { AuthUser } from './auth.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;
const pepper = process.env.API_KEY_PEPPER ?? '';

// Anon-key client for verifying Supabase JWTs.
const verifier = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: WebSocket as any },
});

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key + pepper).digest('hex');
}

function isJwt(token: string): boolean {
  return token.split('.').length === 3;
}

export function requireLeadsAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ??
    (typeof apiKeyHeader === 'string' ? apiKeyHeader : null);

  if (!token) {
    res.status(401).json({ error: 'Missing authentication — provide Bearer token or X-API-Key' });
    return;
  }

  if (isJwt(token)) {
    // Supabase JWT path — same logic as requireAuth
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

        const authUser: AuthUser = {
          id: user.id,
          email: user.email ?? '',
          tenantId,
          tenantRole: membership.role as 'owner' | 'admin' | 'member',
          isSuperAdmin: profile?.is_super_admin ?? false,
        };
        req.user = authUser;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: 'Invalid or expired token' });
      });
    return;
  }

  // API key path — look up by sha256 hash
  const keyHash = hashApiKey(token);
  void (async () => {
    try {
      const { data: row, error } = await adminDb
        .from('api_keys')
        .select('id, user_id, tenant_id, expires_at')
        .eq('key_lookup_hash', keyHash)
        .single();

      if (error || !row) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
        res.status(401).json({ error: 'API key has expired' });
        return;
      }

      // Defense-in-depth: re-check that the key's owner is still a member of
      // the key's tenant. Without this, a key keeps authenticating after its
      // owner has been removed from the tenant. Mirrors the JWT path above.
      // We deliberately keep tenantRole pinned to 'member' regardless of the
      // owner's actual role — API keys don't inherit owner/admin privileges.
      const { data: membership } = await adminDb
        .from('tenant_members')
        .select('role')
        .eq('user_id', row.user_id as string)
        .eq('tenant_id', row.tenant_id as string)
        .maybeSingle();

      if (!membership) {
        res.status(401).json({ error: 'API key owner is no longer a member of this tenant' });
        return;
      }

      // Fire-and-forget last_used_at update
      void adminDb
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', row.id as string);

      const authUser: AuthUser = {
        id: row.user_id as string,
        email: '',
        tenantId: row.tenant_id as string,
        tenantRole: 'member',
        isSuperAdmin: false,
      };
      req.user = authUser;
      next();
    } catch {
      res.status(401).json({ error: 'Authentication error' });
    }
  })();
}
