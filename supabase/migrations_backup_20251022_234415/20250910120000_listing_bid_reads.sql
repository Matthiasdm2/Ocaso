-- Create per-user listing bid read tracking with RLS (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'listing_bid_reads'
  ) then
    create table public.listing_bid_reads (
      user_id uuid not null references public.profiles(id) on delete cascade,
      listing_id uuid not null references public.listings(id) on delete cascade,
      last_seen_count integer not null default 0,
      last_seen_at timestamptz not null default now(),
      primary key (user_id, listing_id)
    );
  end if;
end $$;

alter table public.listing_bid_reads enable row level security;

-- Upsert-friendly policy: users can view and manage only their own rows
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_bid_reads' and policyname='listing_bid_reads_select_own'
  ) then
    create policy listing_bid_reads_select_own on public.listing_bid_reads
      for select using ( auth.uid() = user_id );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_bid_reads' and policyname='listing_bid_reads_insert_own'
  ) then
    create policy listing_bid_reads_insert_own on public.listing_bid_reads
      for insert with check ( auth.uid() = user_id );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_bid_reads' and policyname='listing_bid_reads_update_own'
  ) then
    create policy listing_bid_reads_update_own on public.listing_bid_reads
      for update using ( auth.uid() = user_id );
  end if;
end $$;

-- Helpful index
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and tablename='listing_bid_reads' and indexname='listing_bid_reads_user_listing_idx'
  ) then
    create index listing_bid_reads_user_listing_idx on public.listing_bid_reads (user_id, listing_id);
  end if;
end $$;
