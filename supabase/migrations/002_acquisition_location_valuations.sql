-- designID 002: acquisition, location, valuation history
-- Paste into Supabase SQL Editor and run once (after 001).

alter table public.items
  add column acquired_date       date,
  add column acquired_from       text,
  add column acquisition_method  text check (acquisition_method in ('purchase','auction','gift','inheritance','commission','trade','other')),
  add column acquisition_price   numeric(12,2),
  add column location            text;

create index items_location_idx on public.items(owner_id, location);

create table public.valuations (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items(id) on delete cascade,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  valued_on   date not null default current_date,
  amount      numeric(12,2) not null,
  basis       text check (basis in ('insurance','fair_market','auction_estimate','owner_estimate')),
  appraiser   text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index valuations_item_idx on public.valuations(item_id, valued_on desc);

alter table public.valuations enable row level security;
create policy "owners manage their valuations" on public.valuations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Carry over any single estimated_value into the history, then retire the column.
insert into public.valuations (item_id, owner_id, valued_on, amount, basis)
select id, owner_id, created_at::date, estimated_value, 'owner_estimate'
from public.items where estimated_value is not null;

alter table public.items drop column estimated_value;

-- Latest valuation per item, for the gallery and totals.
create view public.item_current_value with (security_invoker = true) as
select distinct on (item_id) item_id, amount, valued_on, basis
from public.valuations
order by item_id, valued_on desc, created_at desc;
