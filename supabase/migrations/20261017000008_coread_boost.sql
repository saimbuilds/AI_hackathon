-- "Readers like you finished this": among the reader's 20 nearest taste-neighbours, how many finished,
-- saved or loved each candidate story. Five such neighbours = full boost.
create function public.coread_boost(p_user uuid, p_story_ids uuid[]) returns table (story_id uuid, score real)
language sql stable security invoker set search_path = '' as $$
  with me as (select vec_long as v from public.profiles where id = p_user and vec_long is not null),
  nbrs as (
    select p.id from public.profiles p, me
    where p.id <> p_user and p.vec_long is not null and p.onboarded_at is not null
      and (p.vec_long operator(extensions.<=>) me.v) < 0.4
    order by p.vec_long operator(extensions.<=>) me.v limit 20
  )
  select e.story_id, least(1.0, count(distinct e.user_id)::real / 5.0) as score
  from public.events e join nbrs n on n.id = e.user_id
  where e.story_id = any (p_story_ids) and e.type in ('read_end', 'save', 'more')
  group by e.story_id
$$;
revoke execute on function public.coread_boost(uuid, uuid[]) from public, anon, authenticated;
create index events_type_story_idx on public.events (type, story_id) where type in ('read_end', 'save', 'more');
