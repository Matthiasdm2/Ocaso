-- Enable required extensions (idempotent)
create extension if not exists cube;
create extension if not exists earthdistance;

-- Add latitude/longitude columns to listings if they do not exist
alter table listings add column if not exists latitude double precision;
alter table listings add column if not exists longitude double precision;

-- Optional basic index for geo filtering (not a true spatial index but helps)
create index if not exists listings_lat_lng_idx on listings using btree(latitude, longitude);

-- Function returning listings within radius (with pagination)
create or replace function listings_within_radius(
  lat double precision,
  lng double precision,
  radius_km double precision,
  p_offset int default 0,
  p_limit int default 50
) returns setof listings
language sql stable as $$
  select * from listings
  where latitude is not null and longitude is not null
    and earth_distance(ll_to_earth(lat, lng), ll_to_earth(latitude, longitude)) <= radius_km * 1000
  order by earth_distance(ll_to_earth(lat, lng), ll_to_earth(latitude, longitude))
  offset p_offset limit p_limit;
$$;

-- Count helper
create or replace function listings_within_radius_count(
  lat double precision,
  lng double precision,
  radius_km double precision
) returns bigint
language sql stable as $$
  select count(*) from listings
  where latitude is not null and longitude is not null
    and earth_distance(ll_to_earth(lat, lng), ll_to_earth(latitude, longitude)) <= radius_km * 1000;
$$;
