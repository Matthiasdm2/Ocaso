-- Create table for precomputed perceptual hashes per listing image
create table if not exists public.listing_image_hashes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  ahash_64 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, image_url)
);

-- Simple trigger to touch updated_at
create or replace function public.trg_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listing_image_hashes_touch on public.listing_image_hashes;
create trigger trg_listing_image_hashes_touch
before update on public.listing_image_hashes
for each row execute function public.trg_touch_updated_at();

-- RLS (readable to all, insert/update by authenticated)
alter table public.listing_image_hashes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_image_hashes' and policyname='listing_image_hashes_select'
  ) then
    create policy listing_image_hashes_select on public.listing_image_hashes for select using ( true );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_image_hashes' and policyname='listing_image_hashes_write'
  ) then
    create policy listing_image_hashes_write on public.listing_image_hashes for all to authenticated using ( true ) with check ( true );
  end if;
end $$;

create index if not exists listing_image_hashes_listing_id_idx on public.listing_image_hashes(listing_id);