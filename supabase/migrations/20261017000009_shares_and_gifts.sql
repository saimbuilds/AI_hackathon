-- "Send this story to a friend's paper": a link, claimed by whoever opens it and signs in.
create table public.shares (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique default encode(extensions.gen_random_bytes(7), 'hex'),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  from_name    text not null,
  story_id     uuid not null references public.stories(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index shares_from_idx on public.shares (from_user_id);
create index shares_story_idx on public.shares (story_id);

-- One row per recipient who claimed a share; consumed_at is set when the story lands in their paper.
create table public.share_claims (
  share_id     uuid not null references public.shares(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  consumed_at  timestamptz,
  primary key (share_id, recipient_id)
);
create index share_claims_recipient_idx on public.share_claims (recipient_id) where consumed_at is null;

alter table public.shares enable row level security;
alter table public.share_claims enable row level security;
create policy shares_own on public.shares for select to authenticated using (from_user_id = (select auth.uid()));
create policy share_claims_own on public.share_claims for select to authenticated using (recipient_id = (select auth.uid()));

-- Gift papers: who compiled it ("Compiled for Abbu by Saim").
alter table public.gifts add column from_name text;
create index gifts_token_idx on public.gifts (token);
