-- Read active tenant from JWT app_metadata, verified against tenant_members.
-- security definer + locked search_path so the membership check itself isn't
-- subject to tenant_members RLS recursion.
create or replace function get_active_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tm.tenant_id
  from tenant_members tm
  where tm.user_id = auth.uid()
    and tm.tenant_id = nullif(
      auth.jwt() -> 'app_metadata' ->> 'active_tenant_id',
      ''
    )::uuid
  limit 1;
$$;

-- messages: was conversation+user join (pre-tenancy); now conversation+tenant.
drop policy if exists "own messages" on messages;

create policy "tenant messages" on messages
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and c.tenant_id = get_active_tenant_id()
  ))
  with check (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and c.tenant_id = get_active_tenant_id()
  ));

-- agent_run_steps: previously had no RLS (0004 comment said "service_role only").
-- Now tenant-scoped via the parent run.
alter table agent_run_steps enable row level security;

create policy "tenant run steps" on agent_run_steps
  using (exists (
    select 1 from agent_runs r
    where r.id = agent_run_steps.run_id
      and r.tenant_id = get_active_tenant_id()
  ))
  with check (exists (
    select 1 from agent_runs r
    where r.id = agent_run_steps.run_id
      and r.tenant_id = get_active_tenant_id()
  ));
