-- Fix listings RLS policy to ensure anonymous users can read active listings
-- The issue is that auth.uid() returns NULL for anonymous users, which can cause issues
-- We need to ensure the policy explicitly allows anonymous access to active listings

-- Drop and recreate the SELECT policy to ensure it works for anonymous users
DO $$
BEGIN
    DROP POLICY IF EXISTS "listings_select_policy" ON public.listings;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Create policy that explicitly allows anonymous users to read active listings
-- Using COALESCE to handle NULL auth.uid() gracefully
CREATE POLICY "listings_select_policy" ON public.listings
    FOR SELECT USING (
        status = 'actief' 
        OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
        OR auth.role() = 'service_role'
    );

-- Also ensure categories are accessible (needed for listing queries)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='categories'
    ) THEN
        ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
        
        -- Create public read policy for categories
        CREATE POLICY "categories_select_public" ON public.categories
            FOR SELECT TO public USING (true);
    END IF;
END $$;

-- Ensure subcategories are also accessible
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='subcategories'
    ) THEN
        ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "subcategories_select_public" ON public.subcategories;
        
        -- Create public read policy for subcategories
        CREATE POLICY "subcategories_select_public" ON public.subcategories
            FOR SELECT TO public USING (true);
    END IF;
END $$;

