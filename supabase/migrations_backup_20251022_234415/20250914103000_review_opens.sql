-- Track which reviews a seller has explicitly opened
create table if not exists public.review_opens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, review_id)
);
create index if not exists review_opens_user_idx on public.review_opens(user_id);
create index if not exists review_opens_review_idx on public.review_opens(review_id);
