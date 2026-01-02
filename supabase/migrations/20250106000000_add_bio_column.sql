-- Add bio column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
  END IF;
END $$;

-- Ensure conversation_overview RPC function exists
CREATE OR REPLACE FUNCTION public.conversation_overview()
RETURNS TABLE (
  id uuid,
  participants uuid[],
  updated_at timestamptz,
  last_message_id uuid,
  last_message_body text,
  last_message_created_at timestamptz,
  last_message_sender uuid,
  unread_count int,
  listing_id uuid
) 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.participants,
    c.updated_at,
    lm.id as last_message_id,
    CASE WHEN lm.deleted_at IS NOT NULL THEN '[verwijderd]' ELSE lm.body END as last_message_body,
    lm.created_at as last_message_created_at,
    lm.sender_id as last_message_sender,
    COALESCE(
      (
        SELECT COUNT(*)
        FROM public.messages m2
        LEFT JOIN public.conversation_reads cr
          ON cr.conversation_id = c.id
         AND cr.user_id = auth.uid()
        WHERE m2.conversation_id = c.id
          AND m2.sender_id <> auth.uid()
          AND (cr.last_read_at IS NULL OR m2.created_at > cr.last_read_at)
          AND m2.deleted_at IS NULL
      ), 0
    ) as unread_count,
    c.listing_id
  FROM public.conversations c
  LEFT JOIN LATERAL (
    SELECT m.*
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE auth.uid() = ANY(c.participants)
  ORDER BY c.updated_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.conversation_overview() TO anon, authenticated;

