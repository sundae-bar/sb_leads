create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations on delete cascade not null,
  role            text not null check (role in ('user', 'assistant', 'tool')),
  content         text not null,
  metadata        jsonb,        -- token counts, model, tool call IDs
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;

create policy "own messages" on messages
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create index on messages (conversation_id, created_at asc);
