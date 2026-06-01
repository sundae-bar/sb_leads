import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mocks for the modules the auth middlewares reach: the Supabase JWT verifier
// (createClient), the admin DB client, and the per-request user client. This
// lets us exercise every auth branch with no network and no database.
const h = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  // Per-table canned results, set by each test. Keyed by table name because
  // the middlewares issue one `.from(table)...single()` per table.
  const tableResults: Record<string, { data: unknown; error: unknown }> = {};

  type Chain = {
    select: () => Chain;
    eq: () => Chain;
    order: () => Chain;
    limit: () => Chain;
    update: () => Chain;
    insert: () => Chain;
    delete: () => Chain;
    single: () => Promise<{ data: unknown; error: unknown }>;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  };

  const makeChain = (table: string): Chain => {
    const result = () => tableResults[table] ?? { data: null, error: null };
    const chain: Chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      update: () => chain,
      insert: () => chain,
      delete: () => chain,
      single: async () => result(),
      maybeSingle: async () => result(),
    };
    return chain;
  };

  const adminDbMock = { from: (table: string) => makeChain(table) };
  return { mockGetUser, tableResults, adminDbMock };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: h.mockGetUser } }),
}));
vi.mock('../src/db/admin.js', () => ({ adminDb: h.adminDbMock }));
vi.mock('../src/db/factory.js', () => ({ createUserClient: () => ({}) }));

import { requireAuth } from '../src/middleware/auth.js';
import { requireLeadsAuth } from '../src/middleware/requireLeadsAuth.js';

type Middleware = typeof requireAuth;

function appWith(mw: Middleware) {
  const app = express();
  app.use(express.json());
  app.get('/p', mw, (req, res) => {
    res.json({ ok: true, user: req.user });
  });
  return app;
}

function asUser(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      user: {
        id: 'u1',
        email: 'user@example.com',
        app_metadata: { active_tenant_id: 't1' },
        ...overrides,
      },
    },
    error: null,
  };
}

beforeEach(() => {
  h.mockGetUser.mockReset();
  for (const k of Object.keys(h.tableResults)) delete h.tableResults[k];
});

describe('requireAuth (Supabase JWT)', () => {
  it('rejects a missing Authorization header with 401', async () => {
    const res = await request(appWith(requireAuth)).get('/p');
    expect(res.status).toBe(401);
  });

  it('rejects a non-Bearer header with 401', async () => {
    const res = await request(appWith(requireAuth)).get('/p').set('Authorization', 'Basic xyz');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid/expired token with 401', async () => {
    h.mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await request(appWith(requireAuth)).get('/p').set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(401);
  });

  it('rejects a token with no active tenant claim with 403', async () => {
    h.mockGetUser.mockResolvedValue(asUser({ app_metadata: {} }));
    const res = await request(appWith(requireAuth)).get('/p').set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(403);
  });

  it('rejects when the claimed tenant is no longer a membership (stale JWT) with 403', async () => {
    h.mockGetUser.mockResolvedValue(asUser());
    h.tableResults['tenant_members'] = { data: null, error: null }; // membership gone
    const res = await request(appWith(requireAuth)).get('/p').set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no longer valid/i);
  });

  it('accepts a valid token and populates req.user with the membership role', async () => {
    h.mockGetUser.mockResolvedValue(asUser());
    h.tableResults['tenant_members'] = { data: { role: 'admin' }, error: null };
    h.tableResults['profiles'] = { data: { is_super_admin: true }, error: null };
    const res = await request(appWith(requireAuth)).get('/p').set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: 'u1',
      tenantId: 't1',
      tenantRole: 'admin',
      isSuperAdmin: true,
    });
  });
});

describe('requireLeadsAuth — JWT path', () => {
  it('authenticates a valid JWT (3-part token)', async () => {
    h.mockGetUser.mockResolvedValue(asUser());
    h.tableResults['tenant_members'] = { data: { role: 'owner' }, error: null };
    h.tableResults['profiles'] = { data: { is_super_admin: false }, error: null };
    const res = await request(appWith(requireLeadsAuth)).get('/p').set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'u1', tenantId: 't1', tenantRole: 'owner' });
  });
});

describe('requireLeadsAuth — API-key path', () => {
  it('rejects when no token is supplied', async () => {
    const res = await request(appWith(requireLeadsAuth)).get('/p');
    expect(res.status).toBe(401);
  });

  it('authenticates a valid API key and pins the role to member', async () => {
    h.tableResults['api_keys'] = {
      data: { id: 'k1', user_id: 'u1', tenant_id: 't1', expires_at: null },
      error: null,
    };
    h.tableResults['tenant_members'] = { data: { role: 'owner' }, error: null };
    const res = await request(appWith(requireLeadsAuth))
      .get('/p')
      .set('Authorization', 'Bearer sk_test_nodotshere');
    expect(res.status).toBe(200);
    // Even though the owner is role=owner, an API key acts as 'member'.
    expect(res.body.user).toMatchObject({ id: 'u1', tenantId: 't1', tenantRole: 'member' });
  });

  it('rejects an unknown API key with 401', async () => {
    h.tableResults['api_keys'] = { data: null, error: { message: 'not found' } };
    const res = await request(appWith(requireLeadsAuth))
      .get('/p')
      .set('Authorization', 'Bearer sk_unknown_key');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid api key/i);
  });

  it('rejects an expired API key with 401', async () => {
    h.tableResults['api_keys'] = {
      data: { id: 'k1', user_id: 'u1', tenant_id: 't1', expires_at: '2000-01-01T00:00:00Z' },
      error: null,
    };
    const res = await request(appWith(requireLeadsAuth))
      .get('/p')
      .set('Authorization', 'Bearer sk_expired_key');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('rejects a key whose owner is no longer a member of the tenant (revocation)', async () => {
    h.tableResults['api_keys'] = {
      data: { id: 'k1', user_id: 'u1', tenant_id: 't1', expires_at: null },
      error: null,
    };
    h.tableResults['tenant_members'] = { data: null, error: null }; // owner removed
    const res = await request(appWith(requireLeadsAuth))
      .get('/p')
      .set('Authorization', 'Bearer sk_orphaned_key');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no longer a member/i);
  });
});
