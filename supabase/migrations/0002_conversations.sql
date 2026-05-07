create table conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles on delete cascade not null,
  title       text not null default 'New conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "own conversations" on conversations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on conversations (user_id, updated_at desc);
