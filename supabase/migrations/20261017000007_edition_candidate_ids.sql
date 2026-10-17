-- Candidate stories for one reader's edition: the nearest to their taste vector plus the globally most
-- important, minus what they've already been shown or muted. Vector math happens in Postgres.
create function public.edition_candidate_ids(
  p_user uuid, p_vec extensions.vector(384), p_since timestamptz, p_by_sim int, p_by_importance int,
  p_muted_topics text[], p_muted_stories uuid[], p_max_distress int
) returns table (id uuid)
language sql stable security invoker set search_path = '' as $$
  with eligible as (
    select s.id, s.embedding, s.importance, s.source_count
    from public.stories s
    where s.printable and s.updated_at >= p_since and s.distress <= p_max_distress
      and not (s.topics && p_muted_topics)
      and not (s.id = any (p_muted_stories))
      and not exists (select 1 from public.edition_stories es where es.user_id = p_user and es.story_id = s.id)
  ),
  by_sim as (
    select e.id from eligible e where p_vec is not null and e.embedding is not null
    order by e.embedding operator(extensions.<=>) p_vec limit p_by_sim
  ),
  by_imp as (
    select e.id from eligible e order by e.importance desc, e.source_count desc limit p_by_importance
  )
  select id from by_sim union select id from by_imp
$$;
revoke execute on function public.edition_candidate_ids(uuid, extensions.vector, timestamptz, int, int, text[], uuid[], int) from public, anon, authenticated;
