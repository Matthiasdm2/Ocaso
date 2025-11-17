-- Create base tables for the marketplace
-- This should be run first before other migrations

-- Profiles table (extends Supabase auth.users) - only create if not exists
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    create table public.profiles (
      id uuid references auth.users(id) on delete cascade primary key,
      full_name text,
      display_name text,
      shop_name text,
      shop_slug text unique,
      business_logo_url text,
      business_banner_url text,
      business_bio text,
      website text,
      social_instagram text,
      social_facebook text,
      social_tiktok text,
      public_show_email boolean default false,
      public_show_phone boolean default false,
      address jsonb,
      invoice_address text,
      is_business boolean default false,
      company_name text,
      vat text,
      registration_nr text,
      invoice_email text,
      business_plan text,
      business_billing_cycle text,
      avatar_url text,
      stripe_account_id text,
      preferences jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  end if;
end $$;

-- Enable Row Level Security - only if not already enabled
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'profiles' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.profiles enable row level security;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listings') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'listings' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.listings enable row level security;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'bids') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'bids' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.bids enable row level security;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'conversations') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'conversations' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.conversations enable row level security;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'messages') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'messages' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.messages enable row level security;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'reviews') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'reviews' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.reviews enable row level security;
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'follows') then
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'follows' and n.nspname = 'public' and c.relrowsecurity = true) then
      alter table public.follows enable row level security;
    end if;
  end if;
end $$;

-- Create updated_at trigger function - only if not exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Listings table
create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  price numeric,
  category text,
  subcategory text,
  location jsonb,
  images text[],
  seller_id uuid references public.profiles(id) on delete cascade,
  status text default 'draft',
  views bigint default 0,
  favorites_count bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bids table
create table if not exists public.bids (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  bidder_id uuid references public.profiles(id) on delete cascade,
  amount numeric not null,
  message text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Conversations table
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  participants uuid[] not null check (cardinality(participants) = 2),
  listing_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Reviews table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  rating numeric not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Follows table
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, business_id)
);

-- Listings table
create table if not exists public.listings (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  price numeric,
  category text,
  subcategory text,
  location jsonb,
  images text[],
  seller_id uuid references public.profiles(id) on delete cascade,
  status text default 'draft',
  views bigint default 0,
  favorites_count bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bids table
create table if not exists public.bids (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  bidder_id uuid references public.profiles(id) on delete cascade,
  amount numeric not null,
  message text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Conversations table
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Reviews table
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  rating numeric not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Follows table
create table if not exists public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, business_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bids enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.follows enable row level security;

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.listings
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- Add updated_at triggers - only if table exists and trigger doesn't exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    if not exists (select 1 from information_schema.triggers where trigger_name = 'handle_updated_at' and event_object_table = 'profiles') then
      execute 'create trigger handle_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at()';
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listings') then
    if not exists (select 1 from information_schema.triggers where trigger_name = 'handle_updated_at' and event_object_table = 'listings') then
      execute 'create trigger handle_updated_at before update on public.listings for each row execute procedure public.handle_updated_at()';
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'conversations') then
    if not exists (select 1 from information_schema.triggers where trigger_name = 'handle_updated_at' and event_object_table = 'conversations') then
      execute 'create trigger handle_updated_at before update on public.conversations for each row execute procedure public.handle_updated_at()';
    end if;
  end if;
end $$;
