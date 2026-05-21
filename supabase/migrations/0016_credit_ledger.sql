-- Credit ledger + coupons + one-time Stripe top-ups (Crumble-parity).
--
-- Replaces the single-counter design in 0011 with an append-only ledger and
-- a materialised balance per tenant. Coupons + top-ups insert ledger rows;
-- the existing `consume_credits` SQL function is rewritten to insert a debit
-- row instead of decrementing a counter. The legacy `subscriptions` table is
-- preserved for grandfathered subscribers, but its `credits_remaining`
-- column is no longer the source of truth — `tenant_credits.balance` is.
--
-- Backfill at the bottom mirrors every non-zero `subscriptions.credits_remaining`
-- into the ledger so existing tenants don't lose credits on deploy.

-- ─── credit_ledger ───────────────────────────────────────────────────────────
-- Append-only. Positive `amount` credits the tenant; negative debits.
-- Every credit movement (signup grant, coupon, Stripe top-up, subscription
-- invoice, refund, every find_email/verify_email/intent debit) lands here.
create type public.credit_entry_kind as enum (
  'grant',           -- manual admin add, signup grant
  'adjustment',      -- manual admin correction (can be negative)
  'coupon',          -- coupon redemption
  'topup',           -- successful Stripe one-time payment
  'refund',          -- system refund (e.g. no emails returned)
  'debit_find',      -- find_email tool call
  'debit_verify',    -- verify_email tool call
  'debit_intent'     -- get_intent_signals tool call
);

create table public.credit_ledger (
  id           bigserial primary key,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  amount       int  not null,
  kind         public.credit_entry_kind not null,
  description  text,
  ref_type     text,            -- e.g. 'coupon' | 'stripe_session' | 'find_email_request'
  ref_id       text,            -- free-form id matching ref_type
  actor_id     uuid references auth.users(id),  -- null for system entries
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index on public.credit_ledger (tenant_id, created_at desc);
create index on public.credit_ledger (ref_type, ref_id);

alter table public.credit_ledger enable row level security;

create policy "tenant credit_ledger read" on public.credit_ledger
  for select using (tenant_id = get_active_tenant_id());

-- No insert/update/delete policies — all writes happen via SECURITY DEFINER
-- functions (consume_credits, redeem_coupon, refund_credits) or adminDb.

-- ─── tenant_credits ──────────────────────────────────────────────────────────
-- Materialised balance per tenant. O(1) read for "how much do I have left?".
-- Never mutate directly — always go through the ledger so the audit trail
-- stays consistent. Kept in sync by `apply_ledger_to_tenant_credits()` below.
create table public.tenant_credits (
  tenant_id   uuid primary key references public.tenants(id) on delete cascade,
  balance     int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.tenant_credits enable row level security;

create policy "tenant credits read" on public.tenant_credits
  for select using (tenant_id = get_active_tenant_id());

create or replace function public.apply_ledger_to_tenant_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_credits (tenant_id, balance, updated_at)
    values (NEW.tenant_id, NEW.amount, now())
  on conflict (tenant_id) do update
    set balance = public.tenant_credits.balance + NEW.amount,
        updated_at = now();
  return NEW;
end;
$$;

create trigger credit_ledger_apply
  after insert on public.credit_ledger
  for each row execute function public.apply_ledger_to_tenant_credits();

-- ─── coupons ─────────────────────────────────────────────────────────────────
create table public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  amount             int  not null check (amount > 0),
  description        text,
  max_redemptions    int,                          -- null = unlimited
  redemptions_count  int  not null default 0,
  expires_at         timestamptz,
  enabled            boolean not null default true,
  created_at         timestamptz not null default now()
);
create index on public.coupons (lower(code));

alter table public.coupons enable row level security;
-- No read policy for regular users — coupon code lookup happens via the
-- SECURITY DEFINER redeem_coupon RPC so users can't enumerate active codes.
-- Admins access via adminDb (RLS bypass).

create table public.coupon_redemptions (
  id            bigserial primary key,
  coupon_id     uuid not null references public.coupons(id) on delete cascade,
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  amount        int  not null,
  redeemed_by   uuid references auth.users(id),
  redeemed_at   timestamptz not null default now(),
  unique (coupon_id, tenant_id)   -- one redemption per tenant
);
create index on public.coupon_redemptions (tenant_id);

alter table public.coupon_redemptions enable row level security;

create policy "tenant coupon redemptions read" on public.coupon_redemptions
  for select using (tenant_id = get_active_tenant_id());

-- ─── stripe_topup_sessions ───────────────────────────────────────────────────
-- Idempotency record for one-time Stripe payments: a session_id is credited
-- at most once. The webhook handler short-circuits on status='completed'.
create table public.stripe_topup_sessions (
  session_id        text primary key,
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  amount_usd_cents  int  not null,
  credits           int  not null,                 -- typically = amount_usd_cents (1c = 1 credit)
  status            text not null default 'pending',
  initiated_by      uuid references auth.users(id),
  ledger_entry_id   bigint references public.credit_ledger(id),
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index on public.stripe_topup_sessions (tenant_id, created_at desc);

alter table public.stripe_topup_sessions enable row level security;

create policy "tenant topup sessions read" on public.stripe_topup_sessions
  for select using (tenant_id = get_active_tenant_id());

-- ─── RPC: consume_credits (REPLACES the 0011 version) ────────────────────────
-- Atomically check balance, lock the tenant_credits row, and insert a debit
-- ledger entry. The trigger then updates the materialised balance under the
-- same lock so concurrent debits can't oversell.
drop function if exists public.consume_credits(uuid, int);

create or replace function public.consume_credits(
  p_tenant_id   uuid,
  p_amount      int,
  p_kind        text default 'debit_find',         -- one of credit_entry_kind
  p_description text default null,
  p_ref_type    text default null,
  p_ref_id      text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  -- Lock the balance row up front. If the tenant has no row yet (first
  -- credit movement), there's nothing to debit — return false.
  select balance into v_balance from public.tenant_credits
    where tenant_id = p_tenant_id
    for update;

  if v_balance is null or v_balance < p_amount then
    return false;
  end if;

  -- Insert the debit; trigger applies to tenant_credits under our lock.
  insert into public.credit_ledger (tenant_id, amount, kind, description, ref_type, ref_id)
    values (
      p_tenant_id,
      -p_amount,
      p_kind::public.credit_entry_kind,
      p_description,
      p_ref_type,
      p_ref_id
    );

  return true;
end;
$$;

-- ─── RPC: redeem_coupon ──────────────────────────────────────────────────────
-- Caller passes the code; tenant is inferred from get_active_tenant_id().
-- Validates code/expiry/exhaustion, enforces one-per-tenant, inserts
-- redemption row + ledger entry atomically. SECURITY DEFINER because regular
-- users can't see the coupons table.
create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_tenant_id uuid := get_active_tenant_id();
  v_coupon    public.coupons%rowtype;
  v_balance   int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;
  if v_tenant_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_active_tenant');
  end if;

  select * into v_coupon from public.coupons
    where lower(code) = lower(p_code)
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if not v_coupon.enabled then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_coupon.max_redemptions is not null
     and v_coupon.redemptions_count >= v_coupon.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;

  -- One redemption per tenant. The unique index would catch the race; the
  -- explicit check just gives us a clean error path before the insert.
  if exists (
    select 1 from public.coupon_redemptions
      where coupon_id = v_coupon.id and tenant_id = v_tenant_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  insert into public.coupon_redemptions (coupon_id, tenant_id, amount, redeemed_by)
    values (v_coupon.id, v_tenant_id, v_coupon.amount, v_uid);

  update public.coupons
    set redemptions_count = redemptions_count + 1
    where id = v_coupon.id;

  insert into public.credit_ledger
    (tenant_id, amount, kind, description, ref_type, ref_id, actor_id)
    values (
      v_tenant_id,
      v_coupon.amount,
      'coupon',
      coalesce(v_coupon.description, v_coupon.code),
      'coupon',
      v_coupon.id::text,
      v_uid
    );

  select balance into v_balance from public.tenant_credits where tenant_id = v_tenant_id;

  return jsonb_build_object(
    'ok',      true,
    'amount',  v_coupon.amount,
    'balance', v_balance
  );
end;
$$;

grant execute on function public.redeem_coupon(text) to authenticated;

-- ─── Backfill from legacy subscriptions ──────────────────────────────────────
-- Every existing tenant with credits_remaining > 0 gets a one-shot ledger
-- grant equal to that balance, so deploying this migration is non-destructive.
-- The trigger materialises tenant_credits.balance = credits_remaining for each.
-- Idempotent via the ref_type/ref_id guard: re-running this insert skips
-- tenants that already have the backfill row.
insert into public.credit_ledger (tenant_id, amount, kind, description, ref_type, ref_id)
select
  s.tenant_id,
  s.credits_remaining,
  'grant'::public.credit_entry_kind,
  'backfill from subscriptions',
  'migration',
  '0016_backfill'
from public.subscriptions s
where s.credits_remaining > 0
  and not exists (
    select 1 from public.credit_ledger l
    where l.tenant_id = s.tenant_id
      and l.ref_type = 'migration'
      and l.ref_id = '0016_backfill'
  );
