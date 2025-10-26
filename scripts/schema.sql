-- =====================================================================
-- OCASO Schema & Policies (consolideerde SQL)
-- Idempotent waar mogelijk. Pas aan naar productie-conventies indien nodig.
-- Voer dit uit in volgorde. Auth (auth.users) bestaat reeds door Supabase.
-- =====================================================================

begin;

-- EXTENSIONS (indien nog niet aanwezig)
create extension if not exists pgcrypto;

-- =============================
-- TABLE: profiles
-- =============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  address jsonb default '{"street":"","city":"","zip":"","country":"België"}',
  preferences jsonb default '{"language":"nl","newsletter":false}',
  notifications jsonb default '{"newMessages":true,"bids":true,"priceDrops":true,"tips":true}',
  is_business boolean default false,
  company_name text,
  vat text,
  registration_nr text,
  website text,
  invoice_email text,
  bank jsonb default '{"iban":"","bic":""}',
  invoice_address jsonb default '{"street":"","city":"","zip":"","country":"België"}',
  shop_name text,
  shop_slug text unique,
  business_logo_url text,
  business_banner_url text,
  business_bio text,
  social_instagram text,
  social_facebook text,
  social_tiktok text,
  public_show_email boolean default false,
  public_show_phone boolean default false,
  categories text[] default '{}',
  business_plan text default 'basic',
  subscription_active boolean default false,
  rating numeric,
  review_count integer,
  avg_rating numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Zorg dat ontbrekende kolommen worden toegevoegd als de tabel reeds bestond zonder deze velden
DO $$ BEGIN
  -- helper macro via repetitie
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='categories') THEN
    ALTER TABLE public.profiles ADD COLUMN categories text[] DEFAULT '{}'::text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='business_logo_url') THEN
    ALTER TABLE public.profiles ADD COLUMN business_logo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='business_banner_url') THEN
    ALTER TABLE public.profiles ADD COLUMN business_banner_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='business_bio') THEN
    ALTER TABLE public.profiles ADD COLUMN business_bio text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='social_instagram') THEN
    ALTER TABLE public.profiles ADD COLUMN social_instagram text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='social_facebook') THEN
    ALTER TABLE public.profiles ADD COLUMN social_facebook text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='social_tiktok') THEN
    ALTER TABLE public.profiles ADD COLUMN social_tiktok text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='public_show_email') THEN
    ALTER TABLE public.profiles ADD COLUMN public_show_email boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='public_show_phone') THEN
    ALTER TABLE public.profiles ADD COLUMN public_show_phone boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='business_plan') THEN
    ALTER TABLE public.profiles ADD COLUMN business_plan text DEFAULT 'basic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='subscription_active') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_active boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='rating') THEN
    ALTER TABLE public.profiles ADD COLUMN rating numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='review_count') THEN
    ALTER TABLE public.profiles ADD COLUMN review_count integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avg_rating') THEN
    ALTER TABLE public.profiles ADD COLUMN avg_rating numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='ocaso_credits') THEN
    ALTER TABLE public.profiles ADD COLUMN ocaso_credits integer DEFAULT 0;
  END IF;
END $$;

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_touch'
  ) THEN
    CREATE TRIGGER trg_profiles_touch
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

alter table public.profiles enable row level security;

-- Policies (ruim lezen, streng schrijven)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select'
  ) THEN
    CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING ( true );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self'
  ) THEN
    CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_self'
  ) THEN
    CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );
  END IF;
END $$;

create index if not exists profiles_company_name_idx on public.profiles (company_name);
create index if not exists profiles_shop_name_idx on public.profiles (shop_name);
create index if not exists profiles_categories_idx on public.profiles using gin (categories);

-- =============================
-- TABLE: listings
-- =============================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  thumb text,
  main_photo text,
  images text[] default '{}',
  status text default 'active',
  metrics jsonb,
  created_at timestamptz default now()
);

-- Legacy compat: sommige oudere tabellen hadden mogelijk 'user_id' i.p.v. 'seller_id'
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listings' AND column_name='seller_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='listings' AND column_name='user_id'
    ) THEN
      -- Hernoem oude kolom
      EXECUTE 'ALTER TABLE public.listings RENAME COLUMN user_id TO seller_id';
    ELSE
      -- Voeg nieuwe kolom toe (tijdelijk nullable zodat we FK kunnen vullen indien nodig)
      EXECUTE 'ALTER TABLE public.listings ADD COLUMN seller_id uuid';
    END IF;
  END IF;

  -- Zorg dat de foreign key bestaat (anders toevoegen)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'listings' AND c.conname = 'listings_seller_id_fkey'
  ) THEN
    -- Verwijder eventueel losse constraint restanten op user_id
    -- (niet strikt nodig, maar defensief)
    BEGIN
      EXECUTE 'ALTER TABLE public.listings ADD CONSTRAINT listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
    EXCEPTION WHEN duplicate_object THEN
      -- negeren als in race / partial state
      NULL;
    END;
  END IF;

  -- Indien nog NULL waarden maar er bestaat een oude kolom die we hernoemden, niks te doen.
  -- (Eventueel hier data migraties toevoegen indien andere kolomnamen bestonden.)
END $$;

alter table public.listings enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='listings_select_all'
  ) THEN
    CREATE POLICY "listings_select_all" ON public.listings FOR SELECT USING ( true );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='listings_insert_owner'
  ) THEN
    CREATE POLICY "listings_insert_owner" ON public.listings FOR INSERT WITH CHECK ( auth.uid() = seller_id );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='listings_update_owner'
  ) THEN
    CREATE POLICY "listings_update_owner" ON public.listings FOR UPDATE USING ( auth.uid() = seller_id ) WITH CHECK ( auth.uid() = seller_id );
  END IF;
END $$;

create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_status_idx on public.listings (status);

-- =============================
-- TABLE: reviews
-- =============================
create table if not exists public.reviews (
  id bigserial primary key,
  business_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- Zorg dat ontbrekende kolommen worden toegevoegd (legacy tabellen)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='user_id') THEN
    ALTER TABLE public.reviews ADD COLUMN user_id uuid references public.profiles(id) on delete cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='business_id') THEN
    ALTER TABLE public.reviews ADD COLUMN business_id uuid references public.profiles(id) on delete cascade;
  END IF;
END $$;

alter table public.reviews enable row level security;
create index if not exists reviews_business_idx on public.reviews (business_id);
create index if not exists reviews_user_idx on public.reviews (user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_select_all'
  ) THEN
    CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING ( true );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_insert_auth'
  ) THEN
    CREATE POLICY "reviews_insert_auth" ON public.reviews FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_update_self'
  ) THEN
    CREATE POLICY "reviews_update_self" ON public.reviews FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_delete_self'
  ) THEN
    CREATE POLICY "reviews_delete_self" ON public.reviews FOR DELETE USING ( auth.uid() = user_id );
  END IF;
END $$;

-- Rating cache triggers
create or replace function public.refresh_business_rating(biz uuid)
returns void language sql as $$
  update public.profiles p
    set rating = sub.avg_rating,
        review_count = sub.cnt
  from (
    select business_id, avg(rating)::numeric as avg_rating, count(*) as cnt
    from public.reviews
    where business_id = biz
    group by business_id
  ) sub
  where p.id = sub.business_id;
$$;

create or replace function public.on_review_change()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.refresh_business_rating(old.business_id);
  else
    perform public.refresh_business_rating(new.business_id);
  end if;
  return null;
end;$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reviews_refresh'
  ) THEN
    CREATE TRIGGER trg_reviews_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.on_review_change();
  END IF;
END $$;

-- =============================
-- TABLE: conversations
-- =============================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists conversations_parties_idx on public.conversations (seller_id, buyer_id);
create index if not exists conversations_listing_idx on public.conversations (listing_id);
create unique index if not exists conversations_unique_pair on public.conversations (seller_id, buyer_id, listing_id);

alter table public.conversations enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_participant_select'
  ) THEN
    CREATE POLICY "conversations_participant_select" ON public.conversations FOR SELECT USING ( auth.uid() IN (seller_id, buyer_id) );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_insert'
  ) THEN
    CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK ( auth.uid() IN (seller_id, buyer_id) );
  END IF;
END $$;

-- =============================
-- TABLE: messages
-- =============================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text default '',
  created_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select_participants'
  ) THEN
    CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND auth.uid() IN (c.seller_id, c.buyer_id)
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_insert_participant'
  ) THEN
    CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND auth.uid() IN (c.seller_id, c.buyer_id)
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_update_sender'
  ) THEN
    CREATE POLICY "messages_update_sender" ON public.messages FOR UPDATE USING ( auth.uid() = sender_id ) WITH CHECK ( auth.uid() = sender_id );
  END IF;
END $$;

-- =============================
-- TABLE: listing_bid_reads
-- =============================
create table if not exists public.listing_bid_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  last_seen_count int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, listing_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_bid_reads' AND column_name='user_id') THEN
    ALTER TABLE public.listing_bid_reads ADD COLUMN user_id uuid references public.profiles(id) on delete cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_bid_reads' AND column_name='listing_id') THEN
    ALTER TABLE public.listing_bid_reads ADD COLUMN listing_id uuid references public.listings(id) on delete cascade;
  END IF;
END $$;

create index if not exists listing_bid_reads_listing_idx on public.listing_bid_reads (listing_id);

alter table public.listing_bid_reads enable row level security;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listing_bid_reads' AND policyname='bid_reads_select_self'
  ) THEN
    CREATE POLICY "bid_reads_select_self" ON public.listing_bid_reads FOR SELECT USING ( auth.uid() = user_id );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listing_bid_reads' AND policyname='bid_reads_upsert_self'
  ) THEN
    CREATE POLICY "bid_reads_upsert_self" ON public.listing_bid_reads FOR INSERT WITH CHECK ( auth.uid() = user_id );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listing_bid_reads' AND policyname='bid_reads_update_self'
  ) THEN
    CREATE POLICY "bid_reads_update_self" ON public.listing_bid_reads FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );
  END IF;
END $$;

create or replace function public.touch_listing_bid_reads()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bid_reads_touch'
  ) THEN
    CREATE TRIGGER trg_bid_reads_touch
    BEFORE UPDATE ON public.listing_bid_reads
    FOR EACH ROW EXECUTE FUNCTION public.touch_listing_bid_reads();
  END IF;
END $$;

-- =============================
-- STORAGE policies (buckets eerst handmatig aanmaken: business-logos, business-covers)
-- =============================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public read logos'
  ) THEN
    CREATE POLICY "public read logos" ON storage.objects
      FOR SELECT USING ( bucket_id IN ('business-logos','business-covers') );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth insert logos'
  ) THEN
    CREATE POLICY "auth insert logos" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK ( bucket_id IN ('business-logos','business-covers') );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth update logos'
  ) THEN
    CREATE POLICY "auth update logos" ON storage.objects
      FOR UPDATE TO authenticated USING ( bucket_id IN ('business-logos','business-covers') ) WITH CHECK ( bucket_id IN ('business-logos','business-covers') );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth delete logos'
  ) THEN
    CREATE POLICY "auth delete logos" ON storage.objects
      FOR DELETE TO authenticated USING ( bucket_id IN ('business-logos','business-covers') );
  END IF;
END $$;

-- =============================
-- TABLE: credit_transactions
-- =============================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, -- positive for aankoop, negative for gebruik
  transaction_type text not null check (transaction_type in ('purchase', 'usage')),
  description text,
  reference_id uuid, -- kan linken naar QR code of payment
  created_at timestamptz default now()
);

-- Indexen voor credit_transactions
create index if not exists credit_transactions_user_id_idx on public.credit_transactions (user_id);
create index if not exists credit_transactions_created_at_idx on public.credit_transactions (created_at desc);

-- RLS voor credit_transactions
alter table public.credit_transactions enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='credit_transactions_user_select'
  ) THEN
    CREATE POLICY "credit_transactions_user_select" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='credit_transactions_insert'
  ) THEN
    CREATE POLICY "credit_transactions_insert" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='credit_transactions_service_insert'
  ) THEN
    CREATE POLICY "credit_transactions_service_insert" ON public.credit_transactions FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- =============================
-- TRIGGER: Auto-create profile with 1 credit on user signup
-- =============================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, ocaso_credits)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 1);
  return new;
end;
$$;

-- Trigger op auth.users voor nieuwe registraties
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================
-- EXTRA CONSTRAINTS
-- =============================
alter table public.profiles
  drop constraint if exists shop_slug_requires_business;
alter table public.profiles
  add constraint shop_slug_requires_business
  check (shop_slug is null or is_business is true);

commit;

-- Einde schema
