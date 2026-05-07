-- Tenant (workspace) table
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table tenants enable row level security;

-- Tenant-level role enum
create type tenant_role as enum ('owner', 'admin', 'member');

-- Membership join table: one user can belong to multiple tenants
create table tenant_members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants on delete cascade not null,
  user_id     uuid references profiles on delete cascade not null,
  role        tenant_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique(tenant_id, user_id)
);

alter table tenant_members enable row level security;

-- Users can see their own memberships
create policy "view own memberships" on tenant_members
  using (user_id = auth.uid());

-- Users can view tenants they belong to
create policy "view member tenants" on tenants
  using (
    id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );

create index on tenant_members (user_id);
create index on tenant_members (tenant_id);
