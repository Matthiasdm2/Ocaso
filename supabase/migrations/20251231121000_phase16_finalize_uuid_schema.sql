-- ===================================================================
-- PHASE 16: CANONICAL DATA MODEL - STEP 2
-- ===================================================================
-- Migration: 20251231121000_phase16_finalize_uuid_schema.sql
-- Purpose: Complete the UUID migration by replacing old columns
-- Prerequisites: 20251231120000_phase16_canonical_schema_uuid.sql

-- ===================================================================
-- 1) DROP OLD SERIAL COLUMNS AND CONSTRAINTS
-- ===================================================================

-- Drop old foreign key constraint from subcategories
ALTER TABLE public.subcategories 
  DROP CONSTRAINT IF EXISTS subcategories_category_id_fkey;

-- Drop old unique constraints that will be replaced
ALTER TABLE public.categories 
  DROP CONSTRAINT IF EXISTS categories_name_key,
  DROP CONSTRAINT IF EXISTS categories_slug_key;

ALTER TABLE public.subcategories
  DROP CONSTRAINT IF EXISTS subcategories_category_id_slug_key;

ALTER TABLE public.vehicle_brands
  DROP CONSTRAINT IF EXISTS vehicle_brands_slug_vehicle_type_key;

-- ===================================================================
-- 2) RENAME UUID COLUMNS TO BE PRIMARY
-- ===================================================================

-- Categories: rename uuid_id to id and drop old serial id
ALTER TABLE public.categories
  DROP COLUMN IF EXISTS id CASCADE,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.categories
  RENAME COLUMN uuid_id TO id;

-- Make the new UUID column primary key
ALTER TABLE public.categories
  ADD PRIMARY KEY (id);

-- Subcategories: rename columns and drop old ones
ALTER TABLE public.subcategories
  DROP COLUMN IF EXISTS id CASCADE,
  DROP COLUMN IF EXISTS category_id CASCADE,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.subcategories
  RENAME COLUMN uuid_id TO id,
  RENAME COLUMN uuid_category_id TO category_id;

-- Make the new UUID column primary key
ALTER TABLE public.subcategories
  ADD PRIMARY KEY (id);

-- Vehicle brands: rename and clean up
ALTER TABLE public.vehicle_brands
  DROP COLUMN IF EXISTS id CASCADE,
  DROP COLUMN IF EXISTS order_index,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.vehicle_brands
  RENAME COLUMN uuid_id TO id;

-- Make the new UUID column primary key
ALTER TABLE public.vehicle_brands
  ADD PRIMARY KEY (id);

-- ===================================================================
-- 3) ADD PROPER FOREIGN KEY AND CONSTRAINTS
-- ===================================================================

-- Subcategories foreign key to categories
ALTER TABLE public.subcategories
  ADD CONSTRAINT subcategories_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

-- Unique constraints with proper case-insensitive handling
ALTER TABLE public.categories
  ADD CONSTRAINT categories_slug_lower_unique 
    EXCLUDE USING btree (lower(slug) WITH =);

-- For subcategories, we already have the index, now add constraint
ALTER TABLE public.subcategories
  ADD CONSTRAINT subcategories_category_slug_lower_unique
    EXCLUDE USING btree (category_id WITH =, lower(slug) WITH =);

-- Vehicle brands global unique slug
ALTER TABLE public.vehicle_brands
  ADD CONSTRAINT vehicle_brands_slug_lower_unique
    EXCLUDE USING btree (lower(slug) WITH =);

-- ===================================================================
-- 4) STANDARDIZE COLUMN NAMES AND ADD MISSING COLUMNS
-- ===================================================================

-- Add sort_order to vehicle_brands if missing
ALTER TABLE public.vehicle_brands
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- ===================================================================
-- 5) UPDATE TRANSITION VIEWS TO FINAL SCHEMA
-- ===================================================================

-- Drop transition views and create final clean views
DROP VIEW IF EXISTS public.categories_transition;
DROP VIEW IF EXISTS public.subcategories_transition;
DROP VIEW IF EXISTS public.vehicle_brands_transition;

-- Create clean views for API access
CREATE OR REPLACE VIEW public.categories_with_subcategories AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.icon_url,
  c.is_active,
  c.sort_order,
  c.created_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug,
        'sort_order', s.sort_order
      ) ORDER BY s.sort_order, s.name
    ) FILTER (WHERE s.id IS NOT NULL),
    '[]'::json
  ) as subcategories
FROM public.categories c
LEFT JOIN public.subcategories s ON s.category_id = c.id AND s.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.icon_url, c.is_active, c.sort_order, c.created_at
ORDER BY c.sort_order, c.name;

-- Grant access to the view
GRANT SELECT ON public.categories_with_subcategories TO anon, authenticated;

-- ===================================================================
-- 6) ADD HELPFUL FUNCTIONS
-- ===================================================================

-- Function to get vehicle brands by category slug
CREATE OR REPLACE FUNCTION public.get_vehicle_brands_by_category(category_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  sort_order integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vb.id,
    vb.name,
    vb.slug,
    vb.sort_order
  FROM public.vehicle_brands vb
  JOIN public.category_vehicle_brands cvb ON cvb.brand_id = vb.id
  JOIN public.categories c ON c.id = cvb.category_id
  WHERE c.slug = category_slug
    AND c.is_active = true
    AND vb.is_active = true
  ORDER BY vb.sort_order, vb.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_vehicle_brands_by_category(text) TO anon, authenticated;

-- ===================================================================
-- 7) VERIFICATION QUERIES
-- ===================================================================

-- These should all succeed:
-- SELECT count(*) FROM public.categories; 
-- SELECT count(*) FROM public.subcategories;
-- SELECT count(*) FROM public.vehicle_brands;
-- SELECT count(*) FROM public.category_vehicle_brands;
-- SELECT * FROM public.categories_with_subcategories LIMIT 3;
-- SELECT * FROM public.get_vehicle_brands_by_category('autos');

-- Check constraints:
-- \d public.categories
-- \d public.subcategories  
-- \d public.vehicle_brands
-- \d public.category_vehicle_brands
