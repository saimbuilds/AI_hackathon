-- Pricing-page email capture ("Plus", "Gift", "Teams" interest). Server-only: RLS on, no policies.
create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (length(email) between 5 and 254),
  plan        text not null check (plan in ('plus', 'gift', 'teams', 'general')),
  source      text,
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (email, plan)
);
alter table public.waitlist enable row level security;
