-- Fix RLS policies for conversations and messages tables
-- The current policies reference seller_id/buyer_id columns that don't exist
-- They should use the participants array instead

-- Drop existing policies
DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;

-- Create corrected policies for conversations
CREATE POLICY "conversations_participant_select" ON public.conversations
FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "conversations_insert" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- Create corrected policies for messages
CREATE POLICY "messages_select_participants" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)
  )
);

CREATE POLICY "messages_insert_participant" ON public.messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)
  )
);

-- Keep the update policy for messages (sender can edit their own messages)
-- This one should still work as it references sender_id which exists