-- Private bucket for rendered edition PDFs (cached 7 days; the API serves them, nobody reads the bucket directly).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;
