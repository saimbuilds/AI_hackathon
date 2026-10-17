-- A giver can read the editions of the gift papers they made, so "Print the first paper" opens the recipient's
-- paper instead of falling back to the giver's own (editions are otherwise own-rows-only).
create policy editions_gift_giver on public.editions for select to authenticated
  using (exists (select 1 from public.gifts g where g.recipient_user_id = editions.user_id and g.from_user_id = (select auth.uid())));
create policy edition_stories_gift_giver on public.edition_stories for select to authenticated
  using (exists (select 1 from public.gifts g where g.recipient_user_id = edition_stories.user_id and g.from_user_id = (select auth.uid())));
create index if not exists gifts_recipient_idx on public.gifts (recipient_user_id);
