-- OCASO Database Cleanup - Phase D
-- CTO AUDIT: Remove unused tables with concrete proof
-- Date: 2024-12-31
-- Author: Lead Developer/CTO

-- PROOF OF NON-USAGE:
-- 1. follows table: grep search found 0 API calls (.from("follows"))
-- 2. organization_listings: grep search found 0 API calls (.from("organization_listings"))
-- 3. Only references found in TypeScript types (auto-generated) and 1 admin SQL function

-- SAFE REMOVAL: These tables have no application logic dependencies

-- Drop unused tables
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.organization_listings CASCADE;

-- Note: Keeping vehicle_brands and category_vehicle_brands as they are actively used
-- Note: vehicle_brands used in 8+ API routes and services 
-- Note: category_vehicle_brands used via RPC get_vehicle_brands_by_category function
