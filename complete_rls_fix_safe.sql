-- Safe RLS fix for conversations and messages
-- Run this in Supabase SQL editor for the production DB. This script uses DROP POLICY IF EXISTS
-- so it's safe to re-run. It enables RLS and creates policies that allow participants to access
-- conversations and messages by checking the participants array.

BEGIN;

-- Enable RLS on tables (no-op if already enabled)
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
DROP POLICY IF EXISTS conversations_participant_select ON public.conversations;
CREATE POLICY conversations_participant_select ON public.conversations
  FOR SELECT
  USING (auth.uid() = ANY(participants));

DROP POLICY IF EXISTS conversations_participant_insert ON public.conversations;
CREATE POLICY conversations_participant_insert ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = ANY(participants));

DROP POLICY IF EXISTS conversations_participant_update ON public.conversations;
CREATE POLICY conversations_participant_update ON public.conversations
  FOR UPDATE
  USING (auth.uid() = ANY(participants))
  WITH CHECK (auth.uid() = ANY(participants));

DROP POLICY IF EXISTS conversations_participant_delete ON public.conversations;
CREATE POLICY conversations_participant_delete ON public.conversations
  FOR DELETE
  USING (auth.uid() = ANY(participants));

-- Messages policies
DROP POLICY IF EXISTS messages_select_by_conversation_participant ON public.messages;
CREATE POLICY messages_select_by_conversation_participant ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND auth.uid() = ANY(c.participants)
    )
  );

DROP POLICY IF EXISTS messages_insert_for_participant ON public.messages;
CREATE POLICY messages_insert_for_participant ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND auth.uid() = ANY(c.participants)
    )
  );

DROP POLICY IF EXISTS messages_update_sender ON public.messages;
CREATE POLICY messages_update_sender ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

COMMIT;

-- Notes:
-- 1) Run this in the Supabase SQL editor for the target project (production).
-- 2) If you prefer a shorter, fully-destructive approach, you can DROP policies first, but
--    this script already uses DROP POLICY IF EXISTS which is idempotent and safe to re-run.
