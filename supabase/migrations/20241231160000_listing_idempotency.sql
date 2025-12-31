-- Migration: Add idempotency support for listing creation
-- Created: 2024-12-31 16:00:00  
-- Purpose: Prevent duplicate listing creation via request_id tracking

-- Create idempotency table for tracking requests
CREATE TABLE IF NOT EXISTS public.listing_create_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id TEXT NOT NULL UNIQUE,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.listing_create_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own requests
CREATE POLICY "listing_create_requests_policy" ON public.listing_create_requests
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_listing_create_requests_request_id ON public.listing_create_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_listing_create_requests_user_id ON public.listing_create_requests(user_id);

-- Add constraint for status values
ALTER TABLE public.listing_create_requests 
ADD CONSTRAINT chk_status_valid CHECK (status IN ('pending', 'completed', 'failed'));

-- Cleanup function for old pending requests (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_pending_requests() 
RETURNS void AS $$
BEGIN
    DELETE FROM public.listing_create_requests 
    WHERE status = 'pending' 
    AND created_at < (now() - interval '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
