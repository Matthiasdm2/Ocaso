-- Enable vector extension
create extension if not exists vector with schema public;

-- Table to store CLIP embeddings per listing image
create table if not exists public.listing_image_embeddings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  embedding vector(512) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, image_url)
);

-- Touch trigger
create or replace function public.trg_touch_updated_at_vec()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listing_image_embeddings_touch on public.listing_image_embeddings;
create trigger trg_listing_image_embeddings_touch
before update on public.listing_image_embeddings
for each row execute function public.trg_touch_updated_at_vec();

-- RLS (read for all, write for authenticated)
alter table public.listing_image_embeddings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_image_embeddings' and policyname='listing_image_embeddings_select'
  ) then
    create policy listing_image_embeddings_select on public.listing_image_embeddings for select using ( true );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='listing_image_embeddings' and policyname='listing_image_embeddings_write'
  ) then
    create policy listing_image_embeddings_write on public.listing_image_embeddings for all to authenticated using ( true ) with check ( true );
  end if;
end $$;

-- IVFFlat index for fast ANN (use cosine distance)
-- NOTE: After substantial inserts, run: REINDEX or ALTER INDEX ... SET (lists = X) and ANALYZE
create index if not exists listing_image_embeddings_ivfflat_idx
on public.listing_image_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Helper function to match listings by image embedding (aggregate to per-listing min distance)
create or replace function public.match_listing_embeddings(
  query_embedding vector(512),
  match_count int
)
returns table(listing_id uuid, distance double precision)
language sql stable parallel safe
as $$
  with neighbors as (
    select listing_id, (embedding <=> query_embedding) as distance
    from public.listing_image_embeddings
    order by embedding <=> query_embedding
    limit greatest(match_count * 10, 100)
  )
  select listing_id, min(distance) as distance
  from neighbors
  group by listing_id
  order by distance
  limit match_count;
$$;
