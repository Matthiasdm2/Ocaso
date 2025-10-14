-- 0001_create_listing_views.sql
-- Create listing_views table to track unique views per listing by user or session

create extension if not exists pgcrypto;

create table if not exists listing_views (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid null,
  session_id text null,
  created_at timestamptz default now()
);

create index if not exists idx_listing_views_listing_id on listing_views(listing_id);
create index if not exists idx_listing_views_user_id on listing_views(user_id);
create index if not exists idx_listing_views_session_id on listing_views(session_id);

-- Optionally, ensure uniqueness per viewer per listing (uncomment if desired):
-- create unique index if not exists ux_listing_views_unique_view on listing_views(listing_id, coalesce(user_id::text, session_id));
