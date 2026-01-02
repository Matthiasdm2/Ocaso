-- Immediate fix for listing columns - combines all fixes
-- Execute this directly in Supabase SQL Editor if migrations haven't run

-- Fix 1: Add main_photo column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'main_photo'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN main_photo text;
    CREATE INDEX IF NOT EXISTS idx_listings_main_photo ON public.listings(main_photo);
    
    -- Backfill: set main_photo from first image for existing listings
    UPDATE public.listings
    SET main_photo = images[1]
    WHERE main_photo IS NULL 
      AND images IS NOT NULL 
      AND array_length(images, 1) > 0;
  END IF;
END $$;

-- Fix 2: Ensure allowoffers exists (without underscore)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allowoffers'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN allowoffers boolean DEFAULT true;
    
    -- Backfill: if allow_offers column exists, copy values
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allow_offers'
    ) THEN
      UPDATE public.listings SET allowoffers = allow_offers WHERE allowoffers IS NULL;
    END IF;
  END IF;
END $$;

-- Fix 3: Ensure created_by exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    
    -- Backfill: set created_by = seller_id for existing listings
    UPDATE public.listings
    SET created_by = seller_id
    WHERE created_by IS NULL AND seller_id IS NOT NULL;
  END IF;
END $$;

-- Fix 4: Ensure all other required columns exist
DO $$
BEGIN
  -- state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN state text;
  END IF;

  -- location (text version)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN location text;
  END IF;

  -- allow_shipping
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allow_shipping'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN allow_shipping boolean DEFAULT false;
  END IF;

  -- shipping dimensions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_length'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_length numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_width'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_width numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_height'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_height numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_weight'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_weight numeric(10,2);
  END IF;

  -- min_bid
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'min_bid'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN min_bid numeric(10,2);
  END IF;

  -- secure_pay
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'secure_pay'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN secure_pay boolean DEFAULT false;
  END IF;

  -- promo columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'promo_featured'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN promo_featured boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'promo_top'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN promo_top boolean DEFAULT false;
  END IF;

  -- category columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN category_id integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN subcategory_id integer;
  END IF;

  -- stock
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'stock'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN stock integer DEFAULT 1;
  END IF;
END $$;

-- Note: After running this migration, you may need to:
-- 1. Wait a few seconds for PostgREST to refresh its schema cache
-- 2. Or restart your Supabase project to force schema cache refresh
-- 3. Or manually refresh via Supabase Dashboard > Settings > API > Reload Schema

