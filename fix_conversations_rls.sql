-- Fix RLS policies voor conversations tabel met participants array
-- Deze policies vervangen de oude seller_id/buyer_id policies

-- Enable RLS (mocht het uit staan)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop oude policies als ze bestaan
DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;

-- SELECT policy: Users kunnen alleen conversations zien waar ze participant in zijn
CREATE POLICY "conversations_participant_select" ON public.conversations
FOR SELECT USING (auth.uid() = ANY(participants));

-- INSERT policy: Authenticated users kunnen nieuwe conversations aanmaken
-- zolang ze een van de participants zijn
CREATE POLICY "conversations_insert" ON public.conversations
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = ANY(participants)
);

-- UPDATE policy: Alleen participants kunnen conversations updaten
CREATE POLICY "conversations_update" ON public.conversations
FOR UPDATE USING (auth.uid() = ANY(participants));

-- DELETE policy: Alleen participants kunnen conversations verwijderen
CREATE POLICY "conversations_delete" ON public.conversations
FOR DELETE USING (auth.uid() = ANY(participants));
