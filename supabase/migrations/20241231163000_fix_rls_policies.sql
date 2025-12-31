-- Migration: Enable and configure RLS policies for /sell flow
-- Created: 2024-12-31 16:30:00  
-- Purpose: Ensure proper Row Level Security for listing creation flow

-- Enable RLS on listings table if not already enabled
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts and recreate them consistently
DO $$
BEGIN
    DROP POLICY IF EXISTS "listings_select_policy" ON public.listings;
    DROP POLICY IF EXISTS "listings_insert_policy" ON public.listings;
    DROP POLICY IF EXISTS "listings_update_policy" ON public.listings;
    DROP POLICY IF EXISTS "listings_delete_policy" ON public.listings;
EXCEPTION
    WHEN others THEN NULL; -- Ignore if policies don't exist
END $$;

-- Create comprehensive RLS policies for listings
-- SELECT: Public can read active listings, owners can read all their listings
CREATE POLICY "listings_select_policy" ON public.listings
    FOR SELECT USING (
        status = 'actief' 
        OR seller_id = auth.uid()
        OR auth.role() = 'service_role'
    );

-- INSERT: Authenticated users can create listings for themselves
CREATE POLICY "listings_insert_policy" ON public.listings
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND seller_id = auth.uid()
    );

-- UPDATE: Only listing owner can update their listings
CREATE POLICY "listings_update_policy" ON public.listings
    FOR UPDATE USING (
        seller_id = auth.uid()
    ) WITH CHECK (
        seller_id = auth.uid()
    );

-- DELETE: Only listing owner can delete their listings
CREATE POLICY "listings_delete_policy" ON public.listings
    FOR DELETE USING (
        seller_id = auth.uid()
    );

-- Ensure listing_vehicle_details policies are correct
DO $$
BEGIN
    DROP POLICY IF EXISTS "listing_vehicle_details_select_policy" ON public.listing_vehicle_details;
    DROP POLICY IF EXISTS "listing_vehicle_details_insert_policy" ON public.listing_vehicle_details;
    DROP POLICY IF EXISTS "listing_vehicle_details_update_policy" ON public.listing_vehicle_details;
    DROP POLICY IF EXISTS "listing_vehicle_details_delete_policy" ON public.listing_vehicle_details;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Recreate vehicle details policies to match listings access
-- SELECT: Same visibility as the associated listing
CREATE POLICY "listing_vehicle_details_select_policy" ON public.listing_vehicle_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_vehicle_details.listing_id
            AND (
                listings.status = 'actief'
                OR listings.seller_id = auth.uid()
                OR auth.role() = 'service_role'
            )
        )
    );

-- INSERT: Only listing owner can insert vehicle details
CREATE POLICY "listing_vehicle_details_insert_policy" ON public.listing_vehicle_details
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_vehicle_details.listing_id
            AND listings.seller_id = auth.uid()
        )
    );

-- UPDATE: Only listing owner can update vehicle details
CREATE POLICY "listing_vehicle_details_update_policy" ON public.listing_vehicle_details
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_vehicle_details.listing_id
            AND listings.seller_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_vehicle_details.listing_id
            AND listings.seller_id = auth.uid()
        )
    );

-- DELETE: Only listing owner can delete vehicle details
CREATE POLICY "listing_vehicle_details_delete_policy" ON public.listing_vehicle_details
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_vehicle_details.listing_id
            AND listings.seller_id = auth.uid()
        )
    );

-- Ensure idempotency table RLS is properly configured
DO $$
BEGIN
    DROP POLICY IF EXISTS "listing_create_requests_policy" ON public.listing_create_requests;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Recreate idempotency policy
CREATE POLICY "listing_create_requests_policy" ON public.listing_create_requests
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
