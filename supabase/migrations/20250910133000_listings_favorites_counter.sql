-- Add a denormalized favorites_count on listings and keep it in sync via triggers
-- 1) Add column if missing
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0;

-- 2) Backfill from existing favorites
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='favorites'
  ) THEN
    UPDATE public.listings l
    SET favorites_count = sub.cnt
    FROM (
      SELECT listing_id, COUNT(*)::int AS cnt FROM public.favorites GROUP BY listing_id
    ) sub
    WHERE sub.listing_id = l.id;
  END IF;
END $$;

-- 3) Create functions and triggers to sync on insert/delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'favorites_inc_on_insert'
  ) THEN
    CREATE OR REPLACE FUNCTION public.favorites_inc_on_insert() RETURNS trigger AS $finc$
    BEGIN
      UPDATE public.listings SET favorites_count = favorites_count + 1 WHERE id = NEW.listing_id;
      RETURN NEW;
    END;
    $finc$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'favorites_dec_on_delete'
  ) THEN
    CREATE OR REPLACE FUNCTION public.favorites_dec_on_delete() RETURNS trigger AS $fdec$
    BEGIN
      UPDATE public.listings SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = OLD.listing_id;
      RETURN OLD;
    END;
    $fdec$ LANGUAGE plpgsql;
  END IF;

  -- Triggers (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_favorites_inc'
  ) THEN
    CREATE TRIGGER trg_favorites_inc AFTER INSERT ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.favorites_inc_on_insert();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_favorites_dec'
  ) THEN
    CREATE TRIGGER trg_favorites_dec AFTER DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.favorites_dec_on_delete();
  END IF;
END $$;

-- 4) Ensure listings is in the realtime publication so clients see favorites_count change
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='listings'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.listings';
    END IF;
  END IF;
END $$;
