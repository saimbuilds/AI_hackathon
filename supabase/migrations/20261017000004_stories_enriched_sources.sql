-- Re-enrich a story only when it gains real coverage, so remember how many outlets the write-up used.
alter table public.stories add column enriched_sources int not null default 0;
create index stories_enriched_idx on public.stories (enriched_at nulls first, importance desc);
