-- Initial schema: press (global content) + readers (per-user) + ops.
-- Embeddings are 384-d (multilingual-e5-small), computed in the worker only.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------- press ----

create table public.sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  feed_url    text not null unique,
  site_url    text,
  kind        text not null default 'rss'
              check (kind in ('rss','primary','world','gnews','hn','arxiv','reddit','scrape')),
  category    text,
  region      text,
  language    text not null default 'en',
  beat        text,                       -- set by the source scout for niche interests
  status      text not null default 'active' check (status in ('active','failing','dead')),
  last_ok_at  timestamptz,
  last_error  text,
  created_at  timestamptz not null default now()
);

create table public.stories (
  id               uuid primary key default gen_random_uuid(),
  headline         text,
  dek              text,
  why_it_matters   text,
  category         text,
  topics           text[] not null default '{}',
  entities         jsonb not null default '[]',
  importance       int not null default 0 check (importance between 0 and 10),
  distress         int not null default 0 check (distress between 0 and 3),
  unknowns         text,
  quiz             jsonb,
  world            jsonb,                  -- [{country, outlet, line, url}]
  embedding        extensions.vector(384),
  source_count     int not null default 0,
  is_primary       boolean not null default false,
  parent_story_id  uuid references public.stories(id) on delete set null,
  day_count        int not null default 1,
  image_url        text,
  first_seen_at    timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  enriched_at      timestamptz,
  grounding        real                    -- share of sentences that passed the fact-check
);

create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid references public.sources(id) on delete set null,
  story_id      uuid references public.stories(id) on delete set null,
  url           text not null unique,
  title         text not null,
  excerpt       text,
  content_text  text,                      -- pruned after 14 days
  image_url     text,
  language      text,
  published_at  timestamptz,
  embedding     extensions.vector(384),
  created_at    timestamptz not null default now()
);

create table public.story_sentences (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references public.stories(id) on delete cascade,
  position    int not null,
  text        text not null,
  source_ids  uuid[] not null default '{}', -- articles.id the sentence is cited to
  verified    boolean not null default false,
  unique (story_id, position)
);

create table public.daily_three (
  date       date primary key,
  questions  jsonb not null,               -- same for everyone that day
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- readers ----

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text,
  paper_name     text,
  city           text,
  lat            double precision,
  lon            double precision,
  tz             text not null default 'UTC',
  delivery_time  time not null default '07:00',
  size           text not null default 'standard' check (size in ('espresso','standard','long')),
  tone           text not null default 'straight' check (tone in ('straight','new','witty')),
  language       text not null default 'en',
  large_print    boolean not null default false,
  calm           boolean not null default false,
  role           text,
  goals          text,
  interests      jsonb not null default '{}',   -- parsed: interests, entities, negatives, region
  extras         jsonb not null default '{}',
  vec_long       extensions.vector(384),
  vec_short      extensions.vector(384),
  topic_beta     jsonb not null default '{}',   -- {topic: [alpha, beta]}
  muted          jsonb not null default '{"topics":[],"sources":[],"stories":[]}',
  memo           text,
  streak         int not null default 0,
  last_read_on   date,
  email          text,
  email_opt_in   boolean not null default false,
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.editions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  number     int not null,
  payload    jsonb not null,               -- immutable Edition snapshot
  pdf_path   text,
  stats      jsonb not null default '{}',  -- tokens, cost, build ms, fallback used
  created_at timestamptz not null default now(),
  unique (user_id, number)
);

create table public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  edition_id  uuid references public.editions(id) on delete cascade,
  story_id    uuid references public.stories(id) on delete set null,
  type        text not null,
  weight      real not null default 0,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  edition_id  uuid references public.editions(id) on delete set null,
  story_id    uuid references public.stories(id) on delete set null,
  kind        text not null,               -- wrong-facts | broken-link | not-for-me | general
  message     text,
  status      text not null default 'open' check (status in ('open','seen','fixed')),
  created_at  timestamptz not null default now()
);

create table public.gifts (
  id                 uuid primary key default gen_random_uuid(),
  from_user_id       uuid not null references auth.users(id) on delete cascade,
  recipient_user_id  uuid references auth.users(id) on delete set null,
  token              text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  for_name           text not null,
  relation           text,
  language           text not null default 'en',
  large_print        boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ------------------------------------------------------------------ ops ----

create table public.press_runs (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  stats        jsonb not null default '{}', -- articles in, stories, grounding rate, providers used
  errors       jsonb not null default '[]'
);

create table public.jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,               -- edition | email | scout | lab
  user_id      uuid references auth.users(id) on delete cascade,
  payload      jsonb not null default '{}',
  status       text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts     int not null default 0,
  progress     jsonb not null default '[]', -- SSE progress lines
  result       jsonb,
  error        text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

create table public.llm_usage (
  id          bigint generated always as identity primary key,
  day         date not null default current_date,
  provider    text not null,
  model       text not null,
  task        text not null,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(10,6) not null default 0,
  latency_ms  int,
  ok          boolean not null default true,
  error       text,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------- indexes ----

create index articles_embedding_hnsw on public.articles using hnsw (embedding extensions.vector_cosine_ops);
create index stories_embedding_hnsw  on public.stories  using hnsw (embedding extensions.vector_cosine_ops);

create index articles_story_idx      on public.articles (story_id);
create index articles_source_idx     on public.articles (source_id);
create index articles_published_idx  on public.articles (published_at desc);
create index stories_updated_idx     on public.stories (updated_at desc);
create index stories_first_seen_idx  on public.stories (first_seen_at desc);
create index stories_parent_idx      on public.stories (parent_story_id);
create index sentences_story_idx     on public.story_sentences (story_id);
create index editions_user_date_idx  on public.editions (user_id, date desc);
create index events_user_time_idx    on public.events (user_id, created_at desc);
create index events_story_idx        on public.events (story_id);
create index events_edition_idx      on public.events (edition_id);
create index feedback_status_idx     on public.feedback (status, created_at desc);
create index feedback_user_idx       on public.feedback (user_id);
create index gifts_from_idx          on public.gifts (from_user_id);
create index gifts_recipient_idx     on public.gifts (recipient_user_id);
create index jobs_queue_idx          on public.jobs (status, created_at);
create index jobs_user_idx           on public.jobs (user_id);
create index llm_usage_day_idx       on public.llm_usage (day, provider);

-- ------------------------------------------------------------------ RLS ----
-- Server routes use the service-role key (bypasses RLS). Policies below cover
-- what the browser may do directly with the anon/authenticated key.

alter table public.sources         enable row level security;
alter table public.stories         enable row level security;
alter table public.articles        enable row level security;
alter table public.story_sentences enable row level security;
alter table public.daily_three     enable row level security;
alter table public.profiles        enable row level security;
alter table public.editions        enable row level security;
alter table public.events          enable row level security;
alter table public.feedback        enable row level security;
alter table public.gifts           enable row level security;
alter table public.press_runs      enable row level security;
alter table public.jobs            enable row level security;
alter table public.llm_usage       enable row level security;

-- Shared, public news content: readable by any signed-in (incl. anonymous) user.
create policy stories_read         on public.stories         for select to authenticated using (true);
create policy story_sentences_read on public.story_sentences for select to authenticated using (verified);
create policy daily_three_read     on public.daily_three     for select to authenticated using (true);

-- Per-user data.
create policy profiles_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_upd on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy editions_own on public.editions for select to authenticated using (user_id = (select auth.uid()));

create policy events_own    on public.events for select to authenticated using (user_id = (select auth.uid()));
create policy events_insert on public.events for insert to authenticated with check (user_id = (select auth.uid()));

create policy feedback_own    on public.feedback for select to authenticated using (user_id = (select auth.uid()));
create policy feedback_insert on public.feedback for insert to authenticated with check (user_id = (select auth.uid()));

create policy gifts_own on public.gifts for select to authenticated using (from_user_id = (select auth.uid()));

-- sources, articles, press_runs, jobs, llm_usage: RLS on, no policies = server only.

-- ------------------------------------------------------------- triggers ----

-- Every auth user (anonymous included) gets an empty profile.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
