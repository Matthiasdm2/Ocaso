-- QUICK FIX: Copy and paste this entire script into Supabase SQL Editor
-- This will add all missing columns immediately

-- Fix 1: main_photo
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS main_photo text;
CREATE INDEX IF NOT EXISTS idx_listings_main_photo ON public.listings(main_photo);

-- Fix 2: allowoffers (without underscore)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS allowoffers boolean DEFAULT true;

-- Fix 3: created_by
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix 4: Other required columns
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS allow_shipping boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shipping_length numeric(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shipping_width numeric(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shipping_height numeric(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS shipping_weight numeric(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS min_bid numeric(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS secure_pay boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS promo_featured boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS promo_top boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS category_id integer;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS subcategory_id integer;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS stock integer DEFAULT 1;

-- Backfill main_photo from images
UPDATE public.listings
SET main_photo = images[1]
WHERE main_photo IS NULL 
  AND images IS NOT NULL 
  AND array_length(images, 1) > 0;

-- Backfill created_by from seller_id
UPDATE public.listings
SET created_by = seller_id
WHERE created_by IS NULL AND seller_id IS NOT NULL;

-- IMPORTANT: After running this, refresh the schema cache:
-- Go to Supabase Dashboard > Settings > API > Click "Reload Schema" button
-- Or wait 30-60 seconds for automatic refresh

