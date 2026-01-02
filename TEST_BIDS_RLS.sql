-- Test script om te controleren of RLS policies werken voor bids
-- Voer dit uit in Supabase SQL Editor

-- 1. Test of auth.uid() werkt (moet NULL zijn als niet ingelogd)
SELECT auth.uid() as current_user_id;

-- 2. Check of de bids_insert_policy bestaat
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'bids' AND policyname = 'bids_insert_policy';

-- 3. Als auth.uid() NULL is, kunnen we de policy tijdelijk aanpassen
-- om te werken zonder auth.uid() check (alleen voor testing)

-- OPTIE: Tijdelijk de policy uitschakelen en alleen in applicatiecode valideren
-- (NIET aanbevolen voor productie, alleen voor debugging)

-- DROP POLICY IF EXISTS "bids_insert_policy" ON public.bids;
-- CREATE POLICY "bids_insert_policy" ON public.bids
--     FOR INSERT WITH CHECK (true); -- Allow all inserts, validate in app code

-- 4. Check of er bids zijn en wie ze heeft geplaatst
SELECT 
    b.id,
    b.bidder_id,
    b.amount,
    b.created_at,
    l.title as listing_title,
    l.allowoffers
FROM public.bids b
JOIN public.listings l ON l.id = b.listing_id
ORDER BY b.created_at DESC
LIMIT 10;

