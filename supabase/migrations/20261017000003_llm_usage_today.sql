create function public.llm_usage_today()
returns table (provider text, model text, requests bigint, tokens bigint, cost_usd numeric)
language sql stable security invoker set search_path = '' as $$
  select u.provider, u.model, count(*), coalesce(sum(u.tokens_in + u.tokens_out) filter (where u.ok), 0),
         coalesce(sum(u.cost_usd), 0)
  from public.llm_usage u
  where u.day = current_date
  group by u.provider, u.model
$$;

revoke execute on function public.llm_usage_today() from public, anon, authenticated;
