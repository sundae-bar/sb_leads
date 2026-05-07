create table contacts (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants on delete cascade,
  linkedin_url         text not null,
  person               jsonb,
  company              jsonb,
  emails               jsonb not null default '[]',
  providers_attempted  jsonb not null default '[]',
  credits_used         int  not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, linkedin_url)
);

alter table contacts enable row level security;

create policy "tenant contacts" on contacts
  using  (tenant_id = get_active_tenant_id())
  with check (tenant_id = get_active_tenant_id());
