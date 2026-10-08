-- designID 003: no login (single shared collection)
-- Run after 001 and 002. Anyone with the site URL can view and edit.
-- To lock it down later, replace these policies with owner-based ones.

alter table public.items       alter column owner_id drop not null;
alter table public.item_images alter column owner_id drop not null;
alter table public.valuations  alter column owner_id drop not null;
alter table public.collections alter column owner_id drop not null;

drop policy if exists "owners manage their items"           on public.items;
drop policy if exists "owners manage their images"          on public.item_images;
drop policy if exists "owners manage their valuations"      on public.valuations;
drop policy if exists "owners manage their collections"     on public.collections;
drop policy if exists "owners manage collection membership" on public.collection_items;

create policy "open access" on public.items            for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.item_images      for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.valuations       for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.collections      for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.collection_items for all to anon, authenticated using (true) with check (true);

drop policy if exists "users read own images"   on storage.objects;
drop policy if exists "users upload own images" on storage.objects;
drop policy if exists "users delete own images" on storage.objects;

create policy "open read item-images"   on storage.objects for select to anon, authenticated using (bucket_id = 'item-images');
create policy "open upload item-images" on storage.objects for insert to anon, authenticated with check (bucket_id = 'item-images');
create policy "open delete item-images" on storage.objects for delete to anon, authenticated using (bucket_id = 'item-images');
