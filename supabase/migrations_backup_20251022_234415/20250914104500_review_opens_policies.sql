-- Enable RLS and policies for review_opens so client can read its own opened reviews
alter table if exists public.review_opens enable row level security;

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
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
