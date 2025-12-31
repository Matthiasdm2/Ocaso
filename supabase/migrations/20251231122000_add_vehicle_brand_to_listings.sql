-- ===================================================================
-- PHASE 16: ADD VEHICLE BRAND SUPPORT TO LISTINGS
-- ===================================================================
-- Migration: 20251231122000_add_vehicle_brand_to_listings.sql
-- Purpose: Add vehicle brand support to listings table

-- Add vehicle_brand_id column to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS vehicle_brand_id uuid REFERENCES public.vehicle_brands(id);

-- Add index for brand filtering
CREATE INDEX IF NOT EXISTS listings_vehicle_brand_id_idx 
  ON public.listings (vehicle_brand_id);

-- Add index for combined vehicle filtering (category + brand)
CREATE INDEX IF NOT EXISTS listings_category_vehicle_brand_idx 
  ON public.listings (category_id, vehicle_brand_id) 
  WHERE vehicle_brand_id IS NOT NULL;

-- Update RLS policy for listings if needed (should already allow read/write)
