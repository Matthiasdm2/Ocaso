-- ============================================
-- ALL FIXES COMBINED - Execute in Supabase SQL Editor
-- Date: 2025-01-02
-- ============================================

-- ============================================
-- FIX 1: Add missing listing columns
-- ============================================

-- Add main_photo if it doesn't exist
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS main_photo text;
CREATE INDEX IF NOT EXISTS idx_listings_main_photo ON public.listings(main_photo);

-- Add allowoffers (without underscore)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS allowoffers boolean DEFAULT true;

-- Add created_by if it doesn't exist
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add other required columns
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

-- ============================================
-- FIX 2: Fix dashboard stats functions (subquery grouping errors)
-- ============================================

-- Fix recalc_dashboard_stats function
CREATE OR REPLACE FUNCTION public.recalc_dashboard_stats(bid uuid) 
RETURNS void AS $$
DECLARE
  v_listings int;
  v_sold int;
  v_avg int;
  v_views bigint;
  v_bids int;
  v_followers int;
BEGIN
  PERFORM public.ensure_dashboard_stats_row(bid);

  -- Get listings stats
  SELECT count(*) filter (where status in ('active','published')),
         count(*) filter (where status = 'sold'),
         coalesce(avg(price)::int,0),
         coalesce(sum(l.views),0)
  INTO v_listings, v_sold, v_avg, v_views
  FROM listings l
  WHERE l.seller_id = bid;

  -- Get bids count separately to avoid subquery grouping issue
  SELECT coalesce(count(*), 0)
  INTO v_bids
  FROM bids b
  WHERE b.listing_id IN (SELECT id FROM listings WHERE seller_id = bid);

  -- Followers optioneel: probeer query; als tabel niet bestaat => 0
  BEGIN
    EXECUTE 'select count(*) from public.follows where business_id = $1' INTO v_followers USING bid;
  EXCEPTION WHEN undefined_table THEN
    v_followers := 0;  -- tabel bestaat (nog) niet
  END;

  UPDATE public.dashboard_stats ds SET
    listings = coalesce(v_listings,0),
    sold = coalesce(v_sold,0),
    avg_price = coalesce(v_avg,0),
    views = coalesce(v_views,0),
    bids = coalesce(v_bids,0),
    followers = coalesce(v_followers,0),
    updated_at = now()
  WHERE ds.business_id = bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix recompute_dashboard_stats_for function (if it exists)
CREATE OR REPLACE FUNCTION recompute_dashboard_stats_for(bid uuid)
RETURNS void AS $$
DECLARE
  v_listings int;
  v_sold int;
  v_avg int;
  v_views bigint;
  v_bids int;
BEGIN
  -- Get listings count
  SELECT count(*) INTO v_listings
  FROM listings l 
  WHERE (l.seller_id = bid OR l.organization_id = bid) 
    AND (l.status IS NULL OR l.status <> 'deleted');

  -- Get sold count
  SELECT count(*) INTO v_sold
  FROM listings l 
  WHERE (l.seller_id = bid OR l.organization_id = bid) 
    AND l.status = 'sold';

  -- Get average price
  SELECT COALESCE(avg(price)::int, 0) INTO v_avg
  FROM listings l 
  WHERE (l.seller_id = bid OR l.organization_id = bid);

  -- Get views (separate query to avoid JOIN grouping issue)
  SELECT COALESCE(sum(v.count), 0) INTO v_views
  FROM listing_views v 
  WHERE v.listing_id IN (
    SELECT id FROM listings WHERE (seller_id = bid OR organization_id = bid)
  );

  -- Get bids count (separate query to avoid JOIN grouping issue)
  SELECT COALESCE(count(*), 0) INTO v_bids
  FROM bids b 
  WHERE b.listing_id IN (
    SELECT id FROM listings WHERE (seller_id = bid OR organization_id = bid)
  );

  -- Update dashboard_stats
  UPDATE dashboard_stats ds SET
    listings = v_listings,
    sold = v_sold,
    avg_price = v_avg,
    views = v_views,
    bids = v_bids
  WHERE ds.business_id = bid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE! All fixes applied.
-- ============================================

