-- Complete RLS fix for conversations and messages
-- Drop all existing policies first

-- Conversations
DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;
DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;

-- Messages
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender" ON public.messages;

-- Create correct policies

-- Conversations
CREATE POLICY "conversations_participant_select" ON public.conversations
FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "conversations_insert" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

CREATE POLICY "conversations_update" ON public.conversations
FOR UPDATE USING (auth.uid() = ANY(participants));

CREATE POLICY "conversations_delete" ON public.conversations
FOR DELETE USING (auth.uid() = ANY(participants));

-- Messages
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
FOR UPDATE USING (sender_id = auth.uid());
