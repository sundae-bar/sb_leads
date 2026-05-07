create table agent_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete set null,
  conversation_id uuid references conversations on delete set null,
  trigger_type    text not null check (trigger_type in ('chat', 'cron', 'webhook', 'manual')),
  agent_name      text not null,
  status          text not null default 'running'
                    check (status in ('running', 'completed', 'failed')),
  input           jsonb,
  output          jsonb,
  error           text,
  model           text,
  total_tokens    int,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  duration_ms     int
);

alter table agent_runs enable row level security;

create policy "own runs" on agent_runs
  using (auth.uid() = user_id);

create index on agent_runs (user_id, started_at desc);

create table agent_run_steps (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references agent_runs on delete cascade not null,
  step_type     text not null check (step_type in ('llm_call', 'tool_call', 'tool_result', 'error')),
  step_name     text not null,
  input         jsonb,
  output        jsonb,
  error         text,
  sequence      int not null,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  duration_ms   int
);

-- Steps queried via service_role from Express — no RLS needed
create index on agent_run_steps (run_id, sequence asc);
