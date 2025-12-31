-- ===================================================================
-- PHASE 16: CANONICAL DATA MODEL MIGRATION TO UUID
-- ===================================================================
-- Migration: 20251231120000_phase16_canonical_schema_uuid.sql
-- Purpose: Migrate existing categories/subcategories/vehicle_brands to UUID
-- Status: STEP 1 - Add UUID extension and new columns

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1) ADD UUID COLUMNS TO EXISTING TABLES
-- ===================================================================

-- Add UUID column to categories
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS uuid_id uuid DEFAULT gen_random_uuid() UNIQUE;

-- Backfill UUID for existing categories
UPDATE public.categories 
SET uuid_id = gen_random_uuid() 
WHERE uuid_id IS NULL;

-- Add UUID column to subcategories  
ALTER TABLE public.subcategories 
  ADD COLUMN IF NOT EXISTS uuid_id uuid DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS uuid_category_id uuid;

-- Backfill UUID for existing subcategories
UPDATE public.subcategories 
SET uuid_id = gen_random_uuid() 
WHERE uuid_id IS NULL;

-- Link subcategories to categories via UUID
UPDATE public.subcategories s
SET uuid_category_id = c.uuid_id
FROM public.categories c
WHERE s.category_id = c.id;

-- Add UUID column to vehicle_brands
ALTER TABLE public.vehicle_brands 
  ADD COLUMN IF NOT EXISTS uuid_id uuid DEFAULT gen_random_uuid() UNIQUE;

-- Backfill UUID for existing vehicle_brands
UPDATE public.vehicle_brands 
SET uuid_id = gen_random_uuid() 
WHERE uuid_id IS NULL;

-- ===================================================================
-- 2) CREATE category_vehicle_brands MAPPING TABLE (UUID-BASED)
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.category_vehicle_brands (
  category_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (category_id, brand_id)
);

-- Add foreign keys (will be updated after UUID migration completes)
-- Note: These reference the new uuid_id columns
ALTER TABLE public.category_vehicle_brands 
  ADD CONSTRAINT category_vehicle_brands_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.categories(uuid_id) ON DELETE CASCADE,
  ADD CONSTRAINT category_vehicle_brands_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES public.vehicle_brands(uuid_id) ON DELETE CASCADE;

-- ===================================================================
-- 3) ADD PROPER UNIQUE CONSTRAINTS FOR CASE-INSENSITIVE SLUGS
-- ===================================================================

-- Categories: unique lower(slug)
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_lower_unique 
  ON public.categories (lower(slug));

-- Subcategories: unique (category_id, lower(slug)) on both old and new schema
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_slug_lower_unique_old
  ON public.subcategories (category_id, lower(slug));

CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_slug_lower_unique_new
  ON public.subcategories (uuid_category_id, lower(slug));

-- Vehicle brands: unique lower(slug) globally
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_brands_slug_lower_unique 
  ON public.vehicle_brands (lower(slug));

-- ===================================================================
-- 4) RLS POLICIES FOR NEW MAPPING TABLE
-- ===================================================================

-- Enable RLS
ALTER TABLE public.category_vehicle_brands ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "category_vehicle_brands_select" ON public.category_vehicle_brands
  FOR SELECT USING (true);

-- Admin insert policy  
CREATE POLICY "category_vehicle_brands_insert" ON public.category_vehicle_brands
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Admin update policy
CREATE POLICY "category_vehicle_brands_update" ON public.category_vehicle_brands
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Admin delete policy
CREATE POLICY "category_vehicle_brands_delete" ON public.category_vehicle_brands
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- ===================================================================
-- 5) TEMPORARY VIEWS FOR BACKWARD COMPATIBILITY
-- ===================================================================

-- Create view that exposes both old and new IDs during transition
CREATE OR REPLACE VIEW public.categories_transition AS
SELECT 
  id as legacy_id,
  uuid_id as id,
  name,
  slug,
  icon_url,
  is_active,
  COALESCE(position, sort_order, 0) as sort_order,
  created_at
FROM public.categories
ORDER BY sort_order, name;

CREATE OR REPLACE VIEW public.subcategories_transition AS  
SELECT
  id as legacy_id,
  uuid_id as id,
  category_id as legacy_category_id,
  uuid_category_id as category_id,
  name,
  slug,
  is_active,
  sort_order,
  created_at
FROM public.subcategories
ORDER BY sort_order, name;

CREATE OR REPLACE VIEW public.vehicle_brands_transition AS
SELECT
  id as legacy_id,
  uuid_id as id,
  name,
  slug,
  vehicle_type,
  is_active,
  COALESCE(order_index, 0) as sort_order,
  created_at
FROM public.vehicle_brands
ORDER BY sort_order, name;

-- Grant SELECT on views
GRANT SELECT ON public.categories_transition TO anon, authenticated;
GRANT SELECT ON public.subcategories_transition TO anon, authenticated;
GRANT SELECT ON public.vehicle_brands_transition TO anon, authenticated;

-- ===================================================================
-- 6) VERIFICATION QUERIES
-- ===================================================================

-- Check that all records have UUIDs
-- Should return 0:
-- SELECT COUNT(*) FROM public.categories WHERE uuid_id IS NULL;
-- SELECT COUNT(*) FROM public.subcategories WHERE uuid_id IS NULL OR uuid_category_id IS NULL;
-- SELECT COUNT(*) FROM public.vehicle_brands WHERE uuid_id IS NULL;

-- ===================================================================
-- NEXT STEPS (separate migrations):
-- ===================================================================
-- Step 2: Update application code to use transition views
-- Step 3: Seed category_vehicle_brands mappings
-- Step 4: Drop old columns and rename uuid_id to id
-- Step 5: Update foreign keys and constraints
-- Step 6: Drop transition views
