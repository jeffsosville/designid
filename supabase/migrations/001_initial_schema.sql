-- designID: initial schema
-- Paste into Supabase SQL Editor and run once.

create extension if not exists pg_trgm;

-- ---------- Nomenclature (shared reference data, public read) ----------
create table public.nomenclature_terms (
  id            text primary key,              -- concept URI from nomenclature.info
  parent_id     text references public.nomenclature_terms(id),
  level         text,                          -- category / class / subclass / term
  label_en      text not null,
  label_fr      text,
  definition_en text,
  path_en       text,                          -- "Furnishings > Furniture > Seating Furniture > Chair"
  depth         int,
  updated_at    timestamptz not null default now()
);
create index nomenclature_terms_parent_idx on public.nomenclature_terms(parent_id);
create index nomenclature_terms_label_trgm on public.nomenclature_terms using gin (label_en gin_trgm_ops);
create index nomenclature_terms_path_trgm  on public.nomenclature_terms using gin (path_en gin_trgm_ops);

alter table public.nomenclature_terms enable row level security;
create policy "terms are public" on public.nomenclature_terms for select using (true);

-- Autocomplete: exact/prefix matches first, then fuzzy
create or replace function public.search_terms(q text, max_results int default 20)
returns setof public.nomenclature_terms
language sql stable as $$
  select t.*
  from public.nomenclature_terms t
  where t.label_en ilike '%' || q || '%' or t.path_en ilike '%' || q || '%'
     or similarity(t.label_en, q) > 0.3
  order by (lower(t.label_en) = lower(q)) desc,
           (t.label_en ilike q || '%') desc,
           similarity(t.label_en, q) desc
  limit max_results;
$$;

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- User items ----------
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term_id         text references public.nomenclature_terms(id),
  title           text not null,
  description     text,
  maker           text,
  date_made       text,
  materials       text,
  dimensions      text,
  condition       text check (condition in ('excellent','good','fair','poor')),
  provenance      text,
  estimated_value numeric(12,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index items_owner_idx on public.items(owner_id);
create index items_term_idx  on public.items(term_id);
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;
create policy "owners manage their items" on public.items
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- Images ----------
create table public.item_images (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null,                  -- "<user_id>/<item_id>/<file>"
  is_primary   boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index item_images_item_idx on public.item_images(item_id);
create unique index item_images_one_primary on public.item_images(item_id) where is_primary;

alter table public.item_images enable row level security;
create policy "owners manage their images" on public.item_images
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- Collections ----------
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
create table public.collection_items (
  collection_id uuid references public.collections(id) on delete cascade,
  item_id       uuid references public.items(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, item_id)
);

alter table public.collections enable row level security;
create policy "owners manage their collections" on public.collections
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.collection_items enable row level security;
create policy "owners manage collection membership" on public.collection_items
  for all using (exists (select 1 from public.collections c
                         where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.collections c
                      where c.id = collection_id and c.owner_id = auth.uid()));

-- ---------- Storage bucket (private; each user writes under their own folder) ----------
insert into storage.buckets (id, name, public) values ('item-images', 'item-images', false)
on conflict (id) do nothing;

create policy "users read own images" on storage.objects for select
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users upload own images" on storage.objects for insert
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own images" on storage.objects for delete
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
