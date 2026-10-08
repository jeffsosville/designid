-- designID 004: Nomenclature search (alternate names, levels) and hierarchy paths
-- Terms are loaded from the nomenclature.info JSON-LD; then run: select public.rebuild_term_paths();

-- ---------- Nomenclature: alternate names and level ----------
alter table public.nomenclature_terms add column if not exists nom_level int;      -- 1 category … 6 tertiary term
alter table public.nomenclature_terms add column if not exists alt_en   text[] not null default '{}';
alter table public.nomenclature_terms add column if not exists alt_text text;     -- alt_en joined, for search
create index if not exists nomenclature_terms_alt_trgm on public.nomenclature_terms using gin (alt_text gin_trgm_ops);
create index if not exists nomenclature_terms_level_idx on public.nomenclature_terms(nom_level);

create or replace function public.search_terms(q text, max_results int default 20)
returns setof public.nomenclature_terms
language sql stable as $$
  select t.*
  from public.nomenclature_terms t
  where t.label_en ilike '%' || q || '%'
     or t.alt_text ilike '%' || q || '%'
     or similarity(t.label_en, q) > 0.3
  order by (lower(t.label_en) = lower(q)) desc,
           (t.label_en ilike q || '%') desc,
           (t.label_en ilike '%' || q || '%') desc,
           similarity(t.label_en, q) desc,
           t.nom_level desc
  limit max_results;
$$;

-- Rebuild hierarchy paths after an import
create or replace function public.rebuild_term_paths()
returns void language sql as $$
  with recursive tree as (
    select id, label_en::text as path, 1 as depth
    from public.nomenclature_terms where parent_id is null
    union all
    select t.id, tree.path || ' > ' || t.label_en, tree.depth + 1
    from public.nomenclature_terms t join tree on t.parent_id = tree.id
  )
  update public.nomenclature_terms n
     set path_en = tree.path,
         depth   = tree.depth,
         level   = case n.nom_level when 1 then 'category' when 2 then 'class' when 3 then 'subclass'
                                    when 4 then 'primary term' when 5 then 'secondary term' else 'tertiary term' end,
         updated_at = now()
    from tree where tree.id = n.id;
$$;
