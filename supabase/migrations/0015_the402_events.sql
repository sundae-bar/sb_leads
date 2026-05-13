-- the402.ai webhook event log.
--
-- Every incoming the402 webhook is persisted here so we can:
--   1. Verify idempotency — re-deliveries of the same event_id no-op.
--   2. Diagnose failures — error column captures any handler exception.
--   3. Audit billable activity — the402 paid us, we delivered, this is the
--      receipt.
--
-- Not tenant-scoped: the402 customers are anonymous to our system. The table
-- is only ever touched by adminDb from the webhook handler.

create table if not exists the402_events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null unique,
  event_type    text not null,
  service_id    text,
  payload       jsonb not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists the402_events_created_at_idx
  on the402_events (created_at desc);

-- No RLS: internal-only table.
