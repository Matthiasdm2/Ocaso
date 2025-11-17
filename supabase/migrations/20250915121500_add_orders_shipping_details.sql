-- Add shipping_details jsonb to orders if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_details'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_details jsonb;
  END IF;
END$$;
