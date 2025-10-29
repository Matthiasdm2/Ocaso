-- Update RLS policies to allow service_role access

-- Conversations select policy
DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;
CREATE POLICY "conversations_participant_select" ON public.conversations
FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() = ANY(participants));

-- Messages select policy
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants" ON public.messages
FOR SELECT USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)
  )
);
