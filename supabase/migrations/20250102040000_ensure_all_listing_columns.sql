-- Ensure all required columns exist in listings table
-- This migration adds any missing columns that are used in the listing creation API
-- Date: 2025-01-02

DO $$
BEGIN
  -- Add main_photo if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'main_photo'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN main_photo text;
    CREATE INDEX IF NOT EXISTS idx_listings_main_photo ON public.listings(main_photo);
  END IF;

  -- Add created_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add allowoffers if it doesn't exist (without underscore)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allowoffers'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN allowoffers boolean DEFAULT true;
  END IF;

  -- Add state if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN state text;
  END IF;

  -- Add location if it doesn't exist (text version)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN location text;
  END IF;

  -- Add allow_shipping if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allow_shipping'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN allow_shipping boolean DEFAULT false;
  END IF;

  -- Add shipping_length if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_length'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_length numeric(10,2);
  END IF;

  -- Add shipping_width if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_width'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_width numeric(10,2);
  END IF;

  -- Add shipping_height if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_height'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_height numeric(10,2);
  END IF;

  -- Add shipping_weight if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_weight'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_weight numeric(10,2);
  END IF;

  -- Add min_bid if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'min_bid'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN min_bid numeric(10,2);
  END IF;

  -- Add secure_pay if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'secure_pay'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN secure_pay boolean DEFAULT false;
  END IF;

  -- Add promo_featured if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'promo_featured'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN promo_featured boolean DEFAULT false;
  END IF;

  -- Add promo_top if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'promo_top'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN promo_top boolean DEFAULT false;
  END IF;

  -- Add category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN category_id integer;
  END IF;

  -- Add subcategory_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN subcategory_id integer;
  END IF;

  -- Add stock if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'stock'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN stock integer DEFAULT 1;
  END IF;

  -- Update existing listings to set main_photo from first image if null
  UPDATE public.listings
  SET main_photo = images[1]
  WHERE main_photo IS NULL 
    AND images IS NOT NULL 
    AND array_length(images, 1) > 0;

END $$;

