-- Super admin flag on profiles
alter table profiles add column is_super_admin boolean not null default false;

-- Add tenant_id to all data tables
alter table conversations add column tenant_id uuid references tenants on delete cascade;
alter table agent_runs    add column tenant_id uuid references tenants on delete cascade;
alter table api_keys      add column tenant_id uuid references tenants on delete cascade;

-- Tenant-scoped indexes
create index on conversations (tenant_id, updated_at desc);
create index on agent_runs    (tenant_id, started_at desc);
create index on api_keys      (tenant_id, created_at desc);
