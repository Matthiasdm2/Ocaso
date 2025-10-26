-- Fix RLS policies for conversations and messages tables
-- Drop incorrect policies that reference non-existent columns
-- Create correct policies using the participants array

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender" ON public.messages;

-- Create correct policies for conversations
CREATE POLICY "conversations_participant_select" ON public.conversations
FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "conversations_insert" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- Create correct policies for messages
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

CREATE POLICY "messages_update_sender" ON public.messages
FOR UPDATE USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);