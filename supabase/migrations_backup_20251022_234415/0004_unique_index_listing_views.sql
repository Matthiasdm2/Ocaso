-- 0004_unique_index_listing_views.sql
-- Ensure a single unique view record per (listing_id, user_id|session_id)

CREATE UNIQUE INDEX IF NOT EXISTS ux_listing_views_unique_view
  ON listing_views (listing_id, COALESCE(user_id::text, session_id));

-- Optional: if you want to enforce uniqueness at insert-time rather than catching
-- conflicts in the app, keep this index. Run in Supabase SQL editor or via your
-- migration tooling.
