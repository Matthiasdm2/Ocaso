-- Add missing columns to listings table to match the application code
DO $$
BEGIN
  -- Add allowoffers (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allowoffers'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN allowoffers boolean DEFAULT true;
  END IF;

  -- Add state (text, for condition)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN state text;
  END IF;

  -- Add location (text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN location text;
  END IF;

  -- Add allow_shipping (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'allow_shipping'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN allow_shipping boolean DEFAULT false;
  END IF;

  -- Add shipping_length (numeric)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_length'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_length numeric(10,2);
  END IF;

  -- Add shipping_width (numeric)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_width'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_width numeric(10,2);
  END IF;

  -- Add shipping_height (numeric)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_height'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_height numeric(10,2);
  END IF;

  -- Add shipping_weight (numeric)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'shipping_weight'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN shipping_weight numeric(10,2);
  END IF;

  -- Add promo_featured (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'promo_featured'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN promo_featured boolean DEFAULT false;
  END IF;

  -- Add promo_top (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'promo_top'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN promo_top boolean DEFAULT false;
  END IF;

  -- Add min_bid (numeric)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'min_bid'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN min_bid numeric(10,2);
  END IF;

  -- Add secure_pay (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'secure_pay'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN secure_pay boolean DEFAULT false;
  END IF;

  -- Add categories (text[])
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'categories'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN categories text[] DEFAULT '{}';
  END IF;

  -- Add organization_id (uuid, nullable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN organization_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add created_by (uuid, for tracking who created it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Ensure images column exists (text[])
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'images'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN images text[] DEFAULT '{}';
  END IF;

END$$;

-- Create organization_listings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization_listings'
  ) THEN
    CREATE TABLE public.organization_listings (
      organization_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (organization_id, listing_id)
    );
  END IF;
END$$;

-- Enable RLS on organization_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organization_listings' AND policyname='organization_listings_select'
  ) THEN
    ALTER TABLE public.organization_listings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "organization_listings_select" ON public.organization_listings FOR SELECT USING (true);
    CREATE POLICY "organization_listings_insert" ON public.organization_listings FOR INSERT WITH CHECK (auth.uid() IN (
      SELECT seller_id FROM listings WHERE id = listing_id
    ));
  END IF;
END$$;

-- Create index for organization_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'listings' AND indexname = 'listings_organization_id_idx'
  ) THEN
    CREATE INDEX listings_organization_id_idx ON public.listings (organization_id);
  END IF;
END$$;

-- Create index for categories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'listings' AND indexname = 'listings_categories_idx'
  ) THEN
    CREATE INDEX listings_categories_idx ON public.listings USING gin (categories);
  END IF;
END$$;
