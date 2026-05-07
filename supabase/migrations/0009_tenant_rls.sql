-- Helper: returns the active tenant_id set by app code for this DB session.
-- Server-side code calls: select set_config('app.tenant_id', $1, true)
-- before running queries. Super admin switching uses the same mechanism.
create or replace function get_active_tenant_id()
returns uuid
language sql stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid;
$$;

-- ── conversations ──────────────────────────────────────────────────────────
drop policy if exists "own conversations" on conversations;

create policy "tenant conversations" on conversations
  using (tenant_id = get_active_tenant_id())
  with check (tenant_id = get_active_tenant_id());

-- ── agent_runs ─────────────────────────────────────────────────────────────
drop policy if exists "own runs" on agent_runs;

create policy "tenant agent runs" on agent_runs
  using (tenant_id = get_active_tenant_id())
  with check (tenant_id = get_active_tenant_id());

-- ── api_keys ───────────────────────────────────────────────────────────────
drop policy if exists "own api keys" on api_keys;

create policy "tenant api keys" on api_keys
  using (
    tenant_id = get_active_tenant_id()
    and user_id = auth.uid()
  )
  with check (
    tenant_id = get_active_tenant_id()
    and user_id = auth.uid()
  );
