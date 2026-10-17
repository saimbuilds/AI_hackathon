-- Follow & Ask: readers ask a question answered only from press stories, follow it (or a story),
-- and get a "Since you asked" update in their next paper when new stories change the answer.

-- Full-text search over stories and their verified sentences (the web app never embeds).
alter table public.stories add column if not exists search tsvector
  generated always as (to_tsvector('simple', coalesce(headline, '') || ' ' || coalesce(dek, '') || ' ' || coalesce(why_it_matters, ''))) stored;
create index if not exists stories_search_idx on public.stories using gin (search);

alter table public.story_sentences add column if not exists search tsvector
  generated always as (to_tsvector('simple', text)) stored;
create index if not exists story_sentences_search_idx on public.story_sentences using gin (search);

-- Article titles cover stories that were never enriched.
alter table public.articles add column if not exists search tsvector
  generated always as (to_tsvector('simple', coalesce(title, ''))) stored;
create index if not exists articles_search_idx on public.articles using gin (search);

-- Plan: 'free' (3 follows) or 'plus'. Only the server changes it (see column grants below).
alter table public.profiles add column if not exists plan text not null default 'free' check (plan in ('free', 'plus'));

create table public.watches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  kind             text not null check (kind in ('ask', 'story')),
  question         text not null check (length(question) between 3 and 300),
  story_id         uuid references public.stories(id) on delete set null,
  thread_id        uuid references public.stories(id) on delete set null, -- parent story of the followed thread
  keywords         text[] not null default '{}',
  topic            text,
  answer           text,
  sources          jsonb not null default '[]',   -- [{storyId, headline, name, url}]
  last_checked_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index watches_user_idx on public.watches (user_id, created_at desc);
create index watches_story_idx on public.watches (story_id);
create index watches_thread_idx on public.watches (thread_id);

create table public.watch_updates (
  id          uuid primary key default gen_random_uuid(),
  watch_id    uuid not null references public.watches(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  summary     text not null,
  story_ids   uuid[] not null default '{}',
  sources     jsonb not null default '[]',        -- [{name, url}]
  created_at  timestamptz not null default now(),
  seen_at     timestamptz
);
create index watch_updates_watch_idx on public.watch_updates (watch_id, created_at desc);
create index watch_updates_user_unseen_idx on public.watch_updates (user_id) where seen_at is null;

alter table public.watches enable row level security;
alter table public.watch_updates enable row level security;

-- Own rows only. Writes go through the API (service role), which enforces the free-tier cap.
create policy watches_own on public.watches for select to authenticated using (user_id = (select auth.uid()));
create policy watches_delete on public.watches for delete to authenticated using (user_id = (select auth.uid()));
create policy watch_updates_own on public.watch_updates for select to authenticated using (user_id = (select auth.uid()));

-- Ranked text search over recent stories: headline/dek, verified sentences and article titles.
-- `q` is an OR of keywords; a story's rank is the sum of its best matches.
create function public.search_stories(q text, since timestamptz, lim int default 12)
returns table (story_id uuid, rank real)
language sql stable set search_path = '' as $$
  with query as (select to_tsquery('simple', q) as tsq),
  hits as (
    select s.id as story_id, ts_rank_cd(s.search, query.tsq) * 2 as r
      from public.stories s, query
     where s.search @@ query.tsq and s.updated_at >= since and s.printable
    union all
    select ss.story_id, ts_rank_cd(ss.search, query.tsq)
      from public.story_sentences ss join public.stories s on s.id = ss.story_id, query
     where ss.search @@ query.tsq and ss.verified and s.updated_at >= since and s.printable
    union all
    select a.story_id, ts_rank_cd(a.search, query.tsq) * 0.5
      from public.articles a join public.stories s on s.id = a.story_id, query
     where a.search @@ query.tsq and s.updated_at >= since and s.printable
  )
  select story_id, sum(r)::real as rank from hits where story_id is not null
   group by story_id order by rank desc limit lim;
$$;
revoke execute on function public.search_stories(text, timestamptz, int) from public, anon, authenticated;

-- Readers may edit their own profile, but not server-owned columns (plan, streak, learned vectors).
revoke update on public.profiles from authenticated;
grant update (name, paper_name, city, lat, lon, tz, delivery_time, size, tone, language, large_print, calm, role, goals, email, email_opt_in)
  on public.profiles to authenticated;
