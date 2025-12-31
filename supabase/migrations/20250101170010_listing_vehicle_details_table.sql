-- Migration: Create listing_vehicle_details table
-- Created: 2024-12-31 14:01:00
-- Purpose: Store vehicle-specific details for listings in vehicle categories

-- Create listing_vehicle_details table
CREATE TABLE IF NOT EXISTS public.listing_vehicle_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
    year INTEGER,
    mileage_km INTEGER,
    body_type TEXT,
    condition TEXT,
    fuel_type TEXT,
    power_hp INTEGER,
    transmission TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.listing_vehicle_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listing_vehicle_details_listing_id ON public.listing_vehicle_details(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_vehicle_details_year ON public.listing_vehicle_details(year);
CREATE INDEX IF NOT EXISTS idx_listing_vehicle_details_mileage_km ON public.listing_vehicle_details(mileage_km);
CREATE INDEX IF NOT EXISTS idx_listing_vehicle_details_fuel_type ON public.listing_vehicle_details(fuel_type);

-- Add constraint for reasonable year values
ALTER TABLE public.listing_vehicle_details 
ADD CONSTRAINT chk_vehicle_year CHECK (year IS NULL OR (year >= 1900 AND year <= 2030));

-- Add constraint for reasonable mileage values  
ALTER TABLE public.listing_vehicle_details 
ADD CONSTRAINT chk_vehicle_mileage CHECK (mileage_km IS NULL OR mileage_km >= 0);

-- Add constraint for reasonable power values
ALTER TABLE public.listing_vehicle_details 
ADD CONSTRAINT chk_vehicle_power CHECK (power_hp IS NULL OR (power_hp > 0 AND power_hp <= 2000));
