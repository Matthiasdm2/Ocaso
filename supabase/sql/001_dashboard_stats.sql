-- Dashboard stats tabel + triggers
-- Run dit in Supabase SQL editor.

create table if not exists public.dashboard_stats (
  business_id uuid primary key references public.profiles(id) on delete cascade,
  listings int not null default 0,
  sold int not null default 0,
  avg_price int not null default 0,
  views bigint not null default 0,
  bids int not null default 0,
  followers int not null default 0,
  updated_at timestamptz not null default now()
);

-- Snelle helper om een rij aan te maken indien ontbreekt
create or replace function public.ensure_dashboard_stats_row(bid uuid) returns void as $$
begin
  insert into public.dashboard_stats(business_id)
  values (bid)
  on conflict (business_id) do nothing;
end;$$ language plpgsql security definer;

-- Recalc functie
create or replace function public.recalc_dashboard_stats(bid uuid) returns void as $$
declare
  v_listings int;
  v_sold int;
  v_avg int;
  v_views bigint;
  v_bids int;
  v_followers int;
begin
  perform public.ensure_dashboard_stats_row(bid);

  -- Get listings stats
  select count(*) filter (where status in ('active','published')),
         count(*) filter (where status = 'sold'),
         coalesce(avg(price)::int,0),
         coalesce(sum(l.views),0)
  into v_listings, v_sold, v_avg, v_views
  from listings l
  where l.seller_id = bid;

  -- Get bids count separately to avoid subquery grouping issue
  select coalesce(count(*), 0)
  into v_bids
  from bids b
  where b.listing_id IN (SELECT id FROM listings WHERE seller_id = bid);

  -- Followers optioneel: probeer query; als tabel niet bestaat => 0
  begin
    execute 'select count(*) from public.follows where business_id = $1' into v_followers using bid;
  exception when undefined_table then
    v_followers := 0;  -- tabel bestaat (nog) niet
  end;

  update public.dashboard_stats ds set
    listings = coalesce(v_listings,0),
    sold = coalesce(v_sold,0),
    avg_price = coalesce(v_avg,0),
    views = coalesce(v_views,0),
    bids = coalesce(v_bids,0),
    followers = coalesce(v_followers,0),
    updated_at = now()
  where ds.business_id = bid;
end;$$ language plpgsql security definer;

-- Trigger wrappers
create or replace function public.on_listings_change() returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.recalc_dashboard_stats(coalesce(OLD.seller_id));
  else
    perform public.recalc_dashboard_stats(coalesce(NEW.seller_id));
  end if;
  return null;
end;$$ language plpgsql security definer;

create or replace function public.on_follows_change() returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.recalc_dashboard_stats(OLD.business_id);
  else
    perform public.recalc_dashboard_stats(NEW.business_id);
  end if;
  return null;
end;$$ language plpgsql security definer;

-- Triggers (pas tabelnamen/kolommen aan naar jouw schema)
-- listings
create trigger trg_listings_stats
after insert or update or delete on public.listings
for each row execute function public.on_listings_change();

-- follows (optioneel) trigger alleen aanmaken als tabel bestaat
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'follows' and n.nspname = 'public') then
    begin
      create trigger trg_follows_stats
      after insert or delete on public.follows
      for each row execute function public.on_follows_change();
    exception when duplicate_object then
      -- trigger bestaat al
      null;
    end;
  else
    raise notice 'Tabel public.follows niet gevonden; followers statistiek wordt overgeslagen.';
  end if;
end;$$;

-- Init voor bestaande bedrijven
-- select recalc_dashboard_stats(id) from profiles where is_business = true;
