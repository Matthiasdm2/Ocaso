-- Ensure supabase_realtime publication exists and includes tables needed for UI updates
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  -- Create the publication if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Helper function to add a table to publication only if not already added
DO $$
DECLARE
  has_table boolean;
BEGIN
  -- listings
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'listings'
  ) INTO has_table;
  IF NOT has_table THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.listings';
  END IF;

  -- favorites
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'favorites'
  ) INTO has_table;
  IF NOT has_table THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites';
  END IF;
END $$;
