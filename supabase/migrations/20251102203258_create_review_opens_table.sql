-- Track which reviews a seller has explicitly opened
create table if not exists public.review_opens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create index if not exists review_opens_user_idx on public.review_opens(user_id);
create index if not exists review_opens_review_idx on public.review_opens(review_id);

-- Enable RLS
alter table if exists public.review_opens enable row level security;

-- Policies for review_opens
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'review_opens' and policyname = 'select own review opens'
  ) then
    create policy "select own review opens" on public.review_opens
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'review_opens' and policyname = 'insert own review opens'
  ) then
    create policy "insert own review opens" on public.review_opens
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'review_opens' and policyname = 'update own review opens'
  ) then
    create policy "update own review opens" on public.review_opens
      for update using (auth.uid() = user_id);
  end if;
end $$;