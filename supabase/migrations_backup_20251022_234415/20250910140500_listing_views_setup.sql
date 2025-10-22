-- Ensure listing_views and views increment path are correct and idempotent

-- 1) Create table if missing
CREATE TABLE IF NOT EXISTS public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid NULL,
  session_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id),
  UNIQUE (listing_id, session_id)
);

-- 2) Basic FK to listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
      AND table_name = 'listing_views'
      AND constraint_name = 'listing_views_listing_id_fkey'
  ) THEN
    ALTER TABLE public.listing_views
      ADD CONSTRAINT listing_views_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) RLS and policies
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_views' AND policyname = 'select_own_or_session'
  ) THEN
    CREATE POLICY select_own_or_session ON public.listing_views
    FOR SELECT
    USING (
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR (auth.uid() IS NULL AND session_id IS NOT NULL)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_views' AND policyname = 'insert_any'
  ) THEN
    CREATE POLICY insert_any ON public.listing_views
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 4) views increment RPC
CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_views integer;
BEGIN
  UPDATE public.listings SET views = COALESCE(views, 0) + 1 WHERE id = p_listing_id RETURNING views INTO new_views;
  RETURN COALESCE(new_views, 0);
END;
$$;

-- 5) Indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON public.listing_views (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_user ON public.listing_views (user_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_session ON public.listing_views (session_id);

-- 6) Ensure listings in realtime publication (if not already)
DO $$
DECLARE
  has_table boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'listings'
  ) INTO has_table;
  IF NOT has_table THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.listings';
  END IF;
END $$;
