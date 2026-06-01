-- Seed data for LOCAL dev + Supabase preview/persistent branches ONLY.
--
-- This file runs on `supabase start`, `supabase db reset`, and on every
-- Supabase branch (preview + persistent) at creation time. It does NOT run on
-- the production instance — `supabase db push` applies migrations only — so it
-- is safe to keep test-only fixtures here. Keep EVERYTHING synthetic; never put
-- real customer data in this file.

-- QA credit coupon ───────────────────────────────────────────────────────────
-- Lets testers on local/staging/preview grant themselves credits via the
-- redeem-coupon flow (POST /api/billing/coupons/redeem) without running a real
-- Stripe payment. Idempotent so re-seeding is safe.
insert into public.coupons (code, amount, description, enabled)
values ('STAGINGCREDITS', 1000, 'Staging/QA — redeem for 1000 test credits', true)
on conflict (code) do nothing;
