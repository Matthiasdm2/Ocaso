import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/create-review-opens-table
export async function POST() {
  // Return the SQL that needs to be executed manually in Supabase SQL Editor
  const sql = `
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
create policy "select own review opens" on public.review_opens
  for select using (auth.uid() = user_id);

create policy "insert own review opens" on public.review_opens
  for insert with check (auth.uid() = user_id);

create policy "update own review opens" on public.review_opens
  for update using (auth.uid() = user_id);
  `;

  return NextResponse.json({
    error: "review_opens tabel ontbreekt",
    message: "Run deze SQL in Supabase SQL Editor (Dashboard > SQL Editor):",
    sql: sql.trim(),
  }, { status: 500 });
}
