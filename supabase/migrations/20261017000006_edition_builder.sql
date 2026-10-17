-- A story is printable once it has at least one verified, cited sentence (LLM write-up or verbatim fallback).
alter table public.stories add column printable boolean not null default false;
create index stories_printable_idx on public.stories (updated_at desc) where printable;

-- Which stories each reader has been shown (drives "unseen" candidates, co-reads and learning).
create table public.edition_stories (
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  story_id   uuid not null references public.stories(id) on delete cascade,
  slot       text not null,
  position   int  not null default 0,
  primary key (edition_id, story_id)
);
create index edition_stories_user_story_idx on public.edition_stories (user_id, story_id);
create index edition_stories_story_idx on public.edition_stories (story_id);
alter table public.edition_stories enable row level security;
create policy edition_stories_own on public.edition_stories for select to authenticated using (user_id = (select auth.uid()));

-- Postgres semaphore for edition builds: at most p_max running at once, stale slots expire after 3 minutes.
create function public.claim_job_slot(p_job uuid, p_kind text, p_max int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare claimed int;
begin
  perform pg_advisory_xact_lock(hashtext('slot:' || p_kind));
  if (select count(*) from public.jobs where kind = p_kind and status = 'running' and started_at > now() - interval '3 minutes') >= p_max then
    return false;
  end if;
  update public.jobs set status = 'running', started_at = now(), attempts = attempts + 1 where id = p_job and status = 'queued';
  get diagnostics claimed = row_count;
  return claimed > 0;
end $$;

create function public.job_queue_position(p_job uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.jobs j, public.jobs me
  where me.id = p_job and j.kind = me.kind and j.status = 'queued' and j.created_at < me.created_at
$$;

revoke execute on function public.claim_job_slot(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.job_queue_position(uuid) from public, anon, authenticated;
