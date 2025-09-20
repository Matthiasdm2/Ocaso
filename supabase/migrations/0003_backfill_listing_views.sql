-- 0003_backfill_listing_views.sql
-- Backfill listings.views from listing_views counts and ensure sensible defaults

-- Set any NULL views to 0 first to avoid surprises
UPDATE listings SET views = 0 WHERE views IS NULL;

-- Update listings.views with the current aggregate counts from listing_views
UPDATE listings
SET views = agg.cnt
FROM (
  SELECT listing_id, COUNT(*)::int AS cnt
  FROM listing_views
  GROUP BY listing_id
) AS agg
WHERE listings.id = agg.listing_id;

-- Ensure column has a default of 0 for future inserts
ALTER TABLE listings ALTER COLUMN views SET DEFAULT 0;

-- Final safety: any remaining NULLs -> 0
UPDATE listings SET views = 0 WHERE views IS NULL;

-- Note: run this migration once in your Supabase SQL editor or via your migration tooling.
