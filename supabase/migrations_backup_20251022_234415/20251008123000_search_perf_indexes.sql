-- Enable pg_trgm extension if not already
create extension if not exists pg_trgm with schema public;

-- Speed up LIKE/ILIKE on listings.title/description using GIN trigram
create index if not exists listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);
create index if not exists listings_description_trgm_idx on public.listings using gin (description gin_trgm_ops);

-- Speed up ordering by recency
create index if not exists listings_created_at_idx on public.listings (created_at desc);

-- Speed up recency queries on image hashes
create index if not exists listing_image_hashes_updated_at_idx on public.listing_image_hashes (updated_at desc);
