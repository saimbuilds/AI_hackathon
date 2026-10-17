-- Learning Lab results (simulated readers). Public read goes through GET /api/lab; writes are server-only.
create table public.lab_runs (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mode       text not null,
  results    jsonb not null
);
create index lab_runs_created_idx on public.lab_runs (created_at desc);
alter table public.lab_runs enable row level security;
