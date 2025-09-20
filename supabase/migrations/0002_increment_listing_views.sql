-- 0002_increment_listing_views.sql
-- Create an SQL function to atomically increment the listings.views counter (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'increment_listing_views'
      AND pg_get_function_arguments(oid) = 'p_listing_id uuid'
  ) THEN
    CREATE FUNCTION increment_listing_views(p_listing_id uuid)
    RETURNS int
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      new_views int;
    BEGIN
      UPDATE listings
        SET views = coalesce(views,0) + 1
        WHERE id = p_listing_id
        RETURNING views INTO new_views;
      IF new_views IS NULL THEN
        RETURN NULL;
      END IF;
      RETURN new_views;
    END;
    $fn$;
  END IF;
END$$;

-- Optional: cleanup helper (run manually or schedule in your environment)
-- delete from listing_views where created_at < now() - interval '90 days';
