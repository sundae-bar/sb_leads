-- Per-tenant billing state. One row per tenant; absence after this migration is a bug.
create table subscriptions (
  tenant_id              uuid primary key references tenants on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  plan_id                text not null default 'free',
  status                 text not null default 'active', -- active | trialing | past_due | canceled
  credits_remaining      int  not null default 0,
  cycle_started_at       timestamptz not null default now(),
  cycle_ends_at          timestamptz,
  cancel_at_period_end   boolean not null default false,
  auto_rebill_enabled    boolean not null default true,
  last_rebill_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "tenant subscriptions" on subscriptions
  using (tenant_id = get_active_tenant_id())
  with check (tenant_id = get_active_tenant_id());

-- Webhook event dedup. No RLS — only adminDb writes here.
create table processed_stripe_events (
  event_id     text primary key,
  event_type   text not null,
  processed_at timestamptz not null default now()
);

-- Atomic, race-safe credit decrement. Returns true if sufficient, false otherwise.
-- security definer + locked search_path so the update isn't subject to RLS recursion
-- when called via adminDb (RLS bypass) or user-scoped clients.
create or replace function consume_credits(p_tenant_id uuid, p_amount int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  update subscriptions
  set credits_remaining = credits_remaining - p_amount,
      updated_at = now()
  where tenant_id = p_tenant_id
    and credits_remaining >= p_amount
  returning credits_remaining into v_remaining;

  return v_remaining is not null;
end;
$$;

-- Backfill: every existing tenant gets a free-plan row with the default credit grant.
-- The "100" matches PLANS.free.creditsPerCycle in apps/web/src/lib/billing/plans.ts.
-- Keep them in sync if you change the free tier baseline.
insert into subscriptions (tenant_id, plan_id, credits_remaining)
select id, 'free', 100
from tenants
on conflict (tenant_id) do nothing;
