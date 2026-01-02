-- Fix all dashboard stats functions to avoid subquery grouping errors
-- This migration updates all instances of recalc_dashboard_stats and recompute_dashboard_stats_for
-- Date: 2025-01-02

-- Fix 1: recalc_dashboard_stats function (main function)
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

-- Fix 2: recompute_dashboard_stats_for function (alternative function)
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

