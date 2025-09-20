-- Example triggers to keep dashboard_stats in sync.
-- Adjust table/column names to your actual schema.

-- dashboard_stats schema expectation:
-- business_id (uuid) PK/FK
-- listings integer
-- sold integer
-- avg_price integer
-- views integer
-- bids integer
-- followers integer

-- 1. Ensure a stats row exists for each business (profiles / organizations)
INSERT INTO dashboard_stats (business_id, listings, sold, avg_price, views, bids, followers)
SELECT id, 0,0,0,0,0,0 FROM profiles p
LEFT JOIN dashboard_stats ds ON ds.business_id = p.id
WHERE ds.business_id IS NULL;

-- 2. Recompute lightweight aggregates after listings change
CREATE OR REPLACE FUNCTION recompute_dashboard_stats_for(bid uuid)
RETURNS void AS $$
BEGIN
  UPDATE dashboard_stats ds SET
    listings = (
      SELECT count(*) FROM listings l WHERE (l.seller_id = bid OR l.organization_id = bid) AND (l.status IS NULL OR l.status <> 'deleted')
    ),
    sold = (
      SELECT count(*) FROM listings l WHERE (l.seller_id = bid OR l.organization_id = bid) AND l.status = 'sold'
    ),
    avg_price = COALESCE((
      SELECT avg(price)::int FROM listings l WHERE (l.seller_id = bid OR l.organization_id = bid)
    ),0),
    views = COALESCE((
      SELECT sum(v.count) FROM listing_views v JOIN listings l ON l.id = v.listing_id WHERE (l.seller_id = bid OR l.organization_id = bid)
    ),0),
    bids = COALESCE((
      SELECT sum(b.count) FROM listing_bids b JOIN listings l ON l.id = b.listing_id WHERE (l.seller_id = bid OR l.organization_id = bid)
    ),0)
  WHERE ds.business_id = bid;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger on listings table
CREATE OR REPLACE FUNCTION trg_listings_after_change()
RETURNS trigger AS $$
DECLARE
  bid uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    bid = COALESCE(OLD.seller_id, OLD.organization_id);
  ELSE
    bid = COALESCE(NEW.seller_id, NEW.organization_id);
  END IF;
  IF bid IS NOT NULL THEN
    PERFORM recompute_dashboard_stats_for(bid);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_after_change ON listings;
CREATE TRIGGER listings_after_change
AFTER INSERT OR UPDATE OR DELETE ON listings
FOR EACH ROW EXECUTE FUNCTION trg_listings_after_change();

-- 4. Followers / bids table triggers (example skeletons)
-- Adjust for your actual followers table name
CREATE OR REPLACE FUNCTION trg_followers_after_change()
RETURNS trigger AS $$
BEGIN
  UPDATE dashboard_stats ds SET followers = (
    SELECT count(*) FROM follows f WHERE f.business_id = ds.business_id
  ) WHERE ds.business_id = COALESCE(NEW.business_id, OLD.business_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS follows_after_change ON follows;
-- CREATE TRIGGER follows_after_change
-- AFTER INSERT OR DELETE ON follows
-- FOR EACH ROW EXECUTE FUNCTION trg_followers_after_change();

-- 5. Enable realtime replication (once) in Supabase SQL editor:
-- alter publication supabase_realtime add table dashboard_stats;

-- After deploying these, realtime updates + periodic fetch will keep UI fresh.
