-- Tabel voor business volgers
-- Run in Supabase SQL editor NA 001_dashboard_stats.sql

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (business_id, follower_id)
);

-- Indexen voor performance
create index if not exists idx_follows_business on public.follows(business_id);
create index if not exists idx_follows_follower on public.follows(follower_id);

-- (Optioneel) Row Level Security
-- alter table public.follows enable row level security;
-- create policy "insert_own_follow" on public.follows for insert with check (auth.uid() = follower_id);
-- create policy "delete_own_follow" on public.follows for delete using (auth.uid() = follower_id);
-- create policy "read_follows" on public.follows for select using (true);

-- Realtime: voeg deze tabel toe in Supabase dashboard indien je live follower count wilt.

-- Herbereken stats voor bestaande bedrijven (veilig als er 0 rijen zijn)
-- select recalc_dashboard_stats(id) from profiles where is_business = true;
