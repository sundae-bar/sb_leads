create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles on delete cascade not null,
  name          text not null,
  key_hash      text not null,        -- encrypted key value
  key_preview   text not null,        -- e.g., "sk-...x4Rf" for display
  expires_at    timestamptz,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table api_keys enable row level security;

create policy "own api keys" on api_keys
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on api_keys (user_id, created_at desc);
