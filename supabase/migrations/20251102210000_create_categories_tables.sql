-- Create categories and subcategories tables
-- Migration: 20251102210000_create_categories_tables.sql

-- Categories table
create table if not exists public.categories (
  id serial primary key,
  name text not null unique,
  slug text not null unique,
  icon_url text,
  is_active boolean default true,
  position integer,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Subcategories table
create table if not exists public.subcategories (
  id serial primary key,
  category_id integer not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category_id, slug)
);

-- Enable RLS
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

-- RLS Policies
create policy "categories_select" on public.categories
  for select using ( true );

create policy "subcategories_select" on public.subcategories
  for select using ( true );

-- Insert some basic categories
insert into public.categories (name, slug, position, sort_order) values
  ('Elektronica', 'elektronica', 1, 1),
  ('Huis & Tuin', 'huis-tuin', 2, 2),
  ('Auto & Motor', 'auto-motor', 3, 3),
  ('Mode & Schoenen', 'mode-schoenen', 4, 4),
  ('Sport & Hobby', 'sport-hobby', 5, 5),
  ('Boeken & Media', 'boeken-media', 6, 6),
  ('Baby & Kind', 'baby-kind', 7, 7),
  ('Zakelijk', 'zakelijk', 8, 8)
on conflict (name) do nothing;

-- Insert some subcategories
insert into public.subcategories (category_id, name, slug, sort_order) values
  ((select id from public.categories where slug = 'elektronica'), 'Smartphones', 'smartphones', 1),
  ((select id from public.categories where slug = 'elektronica'), 'Laptops', 'laptops', 2),
  ((select id from public.categories where slug = 'elektronica'), 'Tablets', 'tablets', 3),
  ((select id from public.categories where slug = 'huis-tuin'), 'Meubels', 'meubels', 1),
  ((select id from public.categories where slug = 'huis-tuin'), 'Tuin', 'tuin', 2),
  ((select id from public.categories where slug = 'auto-motor'), 'Auto-onderdelen', 'auto-onderdelen', 1),
  ((select id from public.categories where slug = 'mode-schoenen'), 'Kleding', 'kleding', 1),
  ((select id from public.categories where slug = 'sport-hobby'), 'Fietsen', 'fietsen', 1)
on conflict (category_id, slug) do nothing;

-- Create indexes
create index if not exists categories_slug_idx on public.categories (slug);
create index if not exists subcategories_category_id_idx on public.subcategories (category_id);
create index if not exists subcategories_slug_idx on public.subcategories (slug);
