-- =====================================================================
-- OCASO CORE SCHEMA (minimalistisch)
-- Bevat enkel strikt nodige velden voor basis functionaliteit:
--  - Profielen (basis + business branding)
--  - Listings
--  - Reviews (zonder rating-cache kolommen; altijd live aggregatie)
--  - Optionele views voor rating aggregatie
-- Laat alles weg wat marketing / social / abonnement / categorie / metrics is.
-- =====================================================================

begin;
create extension if not exists pgcrypto;

-- =============================
-- TABLE: profiles (core)
-- =============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  -- Business essentials
  is_business boolean default false,
  shop_name text,
  shop_slug text unique,
  business_logo_url text,
  business_banner_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Touch trigger (generic)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_touch'
  ) THEN
    CREATE TRIGGER trg_profiles_touch
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

alter table public.profiles enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select'
  ) THEN
    CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING ( true );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_upsert_self'
  ) THEN
    CREATE POLICY "profiles_upsert_self" ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self'
  ) THEN
    CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );
  END IF;
END $$;

alter table public.profiles
  drop constraint if exists shop_slug_requires_business;
alter table public.profiles
  add constraint shop_slug_requires_business
  check (shop_slug is null or is_business is true);

create index if not exists profiles_shop_name_idx on public.profiles (shop_name);

-- =============================
-- TABLE: listings (core)
-- =============================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  images text[] default '{}',
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.listings enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='listings_select_all') THEN
    CREATE POLICY "listings_select_all" ON public.listings FOR SELECT USING ( true );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='listings_insert_owner') THEN
    CREATE POLICY "listings_insert_owner" ON public.listings FOR INSERT WITH CHECK ( auth.uid() = seller_id );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='listings_update_owner') THEN
    CREATE POLICY "listings_update_owner" ON public.listings FOR UPDATE USING ( auth.uid() = seller_id ) WITH CHECK ( auth.uid() = seller_id );
  END IF;
END $$;

create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_status_idx on public.listings (status);

-- =============================
-- TABLE: reviews (no cached columns)
-- =============================
create table if not exists public.reviews (
  id bigserial primary key,
  business_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_select_all') THEN
    CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING ( true );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_insert_auth') THEN
    CREATE POLICY "reviews_insert_auth" ON public.reviews FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_update_self') THEN
    CREATE POLICY "reviews_update_self" ON public.reviews FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_delete_self') THEN
    CREATE POLICY "reviews_delete_self" ON public.reviews FOR DELETE USING ( auth.uid() = user_id );
  END IF;
END $$;

create index if not exists reviews_business_idx on public.reviews (business_id);
create index if not exists reviews_user_idx on public.reviews (user_id);

-- =============================
-- VIEW: business_ratings (on-the-fly aggregatie)
-- =============================
create or replace view public.business_ratings as
  select business_id as id,
         avg(rating)::numeric(10,2) as avg_rating,
         count(*)::int as review_count
  from public.reviews
  group by business_id;

-- =============================
-- OPTIONAL (commentaar laten staan indien later nodig)
--   conversations / messages / listing_bid_reads kunnen uit originele schema.sql
-- =============================
-- (Niet opgenomen in CORE)

commit;
