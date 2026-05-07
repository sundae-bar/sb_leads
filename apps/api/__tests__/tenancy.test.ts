import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    'Tests require SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in env',
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
  tenantId: string;
}

const createdUserIds: string[] = [];
const createdTenantIds: string[] = [];

async function createTenant(name: string): Promise<string> {
  const slug = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const { data, error } = await admin
    .from('tenants')
    .insert({ name, slug })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('failed to create tenant');
  createdTenantIds.push(data.id);
  return data.id;
}

async function createUser(opts: { tenantId: string; activeTenantId?: string }): Promise<TestUser> {
  const password = `Pw${randomUUID()}`;
  const email = `test-${randomUUID().slice(0, 8)}@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('failed to create user');
  createdUserIds.push(data.user.id);

  const { error: memberErr } = await admin
    .from('tenant_members')
    .insert({ tenant_id: opts.tenantId, user_id: data.user.id, role: 'member' });
  if (memberErr) throw memberErr;

  // Stamp app_metadata BEFORE signing in so the issued JWT carries the claim.
  const { error: metaErr } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { active_tenant_id: opts.activeTenantId ?? opts.tenantId },
  });
  if (metaErr) throw metaErr;

  const userClient = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { id: data.user.id, email, password, client: userClient, tenantId: opts.tenantId };
}

let tenantA: string;
let tenantB: string;
let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  tenantA = await createTenant('TestA');
  tenantB = await createTenant('TestB');
  userA = await createUser({ tenantId: tenantA });
  userB = await createUser({ tenantId: tenantB });
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  }
  for (const tenantId of createdTenantIds) {
    await admin.from('tenants').delete().eq('id', tenantId);
  }
});

describe('cross-tenant isolation via RLS', () => {
  it('list/get conversations: each tenant sees only its own', async () => {
    // userA inserts a conversation; RLS should let only userA see it.
    const { data: convA, error: insertErr } = await userA.client
      .from('conversations')
      .insert({ user_id: userA.id, tenant_id: tenantA, title: 'A only' })
      .select()
      .single();
    expect(insertErr).toBeNull();
    expect(convA).toBeTruthy();

    // userA lists.
    const aList = await userA.client.from('conversations').select('*');
    expect(aList.error).toBeNull();
    expect(aList.data?.some((c) => c.id === convA!.id)).toBe(true);

    // userB lists — must not see A's row.
    const bList = await userB.client.from('conversations').select('*');
    expect(bList.error).toBeNull();
    expect(bList.data?.some((c) => c.id === convA!.id)).toBe(false);

    // userB direct lookup — must return nothing.
    const bGet = await userB.client.from('conversations').select('*').eq('id', convA!.id).maybeSingle();
    expect(bGet.error).toBeNull();
    expect(bGet.data).toBeNull();
  });

  it('messages are scoped via the parent conversation', async () => {
    const { data: convA } = await userA.client
      .from('conversations')
      .insert({ user_id: userA.id, tenant_id: tenantA, title: 'msgs' })
      .select()
      .single();
    const convId = convA!.id;

    const { error: msgErr } = await userA.client
      .from('messages')
      .insert({ conversation_id: convId, role: 'user', content: 'hello A' });
    expect(msgErr).toBeNull();

    const aMsgs = await userA.client.from('messages').select('*').eq('conversation_id', convId);
    expect(aMsgs.data?.length).toBeGreaterThan(0);

    const bMsgs = await userB.client.from('messages').select('*').eq('conversation_id', convId);
    expect(bMsgs.data?.length ?? 0).toBe(0);
  });

  it('agent_runs and agent_run_steps are tenant-scoped', async () => {
    const { data: run, error: runErr } = await userA.client
      .from('agent_runs')
      .insert({
        agent_name: 'test',
        trigger_type: 'chat',
        user_id: userA.id,
        tenant_id: tenantA,
        status: 'running',
      })
      .select()
      .single();
    expect(runErr).toBeNull();
    expect(run).toBeTruthy();

    const { error: stepErr } = await userA.client.from('agent_run_steps').insert({
      run_id: run!.id,
      step_type: 'llm_call',
      step_name: 'initial',
      sequence: 0,
    });
    expect(stepErr).toBeNull();

    const bRuns = await userB.client.from('agent_runs').select('*').eq('id', run!.id);
    expect(bRuns.data?.length ?? 0).toBe(0);

    const bSteps = await userB.client.from('agent_run_steps').select('*').eq('run_id', run!.id);
    expect(bSteps.data?.length ?? 0).toBe(0);
  });

  it('api_keys are tenant + user scoped', async () => {
    const { data: key, error: keyErr } = await userA.client
      .from('api_keys')
      .insert({
        user_id: userA.id,
        tenant_id: tenantA,
        name: 'test',
        key_hash: 'hash',
        key_preview: 'sk-...test',
      })
      .select()
      .single();
    expect(keyErr).toBeNull();

    const aKeys = await userA.client.from('api_keys').select('*');
    expect(aKeys.data?.some((k) => k.id === key!.id)).toBe(true);

    const bKeys = await userB.client.from('api_keys').select('*').eq('id', key!.id);
    expect(bKeys.data?.length ?? 0).toBe(0);
  });

  it('write attempt across tenants is rejected by WITH CHECK', async () => {
    // userA tries to create a conversation tagged with tenantB.
    const { error } = await userA.client
      .from('conversations')
      .insert({ user_id: userA.id, tenant_id: tenantB, title: 'forged' });
    expect(error).not.toBeNull();
  });

  it('spoofed JWT (claim points to a non-membership tenant) returns 0 rows', async () => {
    // Create a user, set app_metadata.active_tenant_id to a tenant they are NOT a member of.
    // The membership join in get_active_tenant_id() should fail closed.
    const spoofer = await createUser({ tenantId: tenantA, activeTenantId: tenantB });

    // Plant a row in tenantB so the test would catch a leak if the policy were broken.
    const { data: convB } = await userB.client
      .from('conversations')
      .insert({ user_id: userB.id, tenant_id: tenantB, title: 'B private' })
      .select()
      .single();
    expect(convB).toBeTruthy();

    const list = await spoofer.client.from('conversations').select('*');
    expect(list.error).toBeNull();
    // Spoofer must see neither tenantA nor tenantB rows — get_active_tenant_id() returns null.
    expect(list.data?.some((c) => c.tenant_id === tenantB)).toBe(false);
    expect(list.data?.length ?? 0).toBe(0);
  });
});
