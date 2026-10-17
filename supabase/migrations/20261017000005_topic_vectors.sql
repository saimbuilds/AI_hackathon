-- Precomputed fingerprints for the fixed topic vocabulary (src/lib/taxonomy.ts TOPICS), written by the worker.
-- The web app maps a reader's parsed interests to these slugs, so it never needs to embed anything.
create table public.topic_vectors (
  topic       text primary key,
  description text not null,
  embedding   extensions.vector(384) not null,
  updated_at  timestamptz not null default now()
);
alter table public.topic_vectors enable row level security;
