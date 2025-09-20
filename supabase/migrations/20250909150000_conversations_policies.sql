-- Add RLS policies for conversations table (missing previously, causing 404/not_found in API)
-- Safely create policies only if table exists. Also add helpful index for participants lookups.
DO $$
DECLARE has_table boolean; BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='conversations'
  ) INTO has_table;
  IF has_table THEN
    -- Enable RLS
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

    -- Drop old policies if any (idempotent)
    DROP POLICY IF EXISTS conversations_select ON public.conversations;
    DROP POLICY IF EXISTS conversations_insert ON public.conversations;
    DROP POLICY IF EXISTS conversations_update ON public.conversations;

    -- Only participants can view
    CREATE POLICY conversations_select ON public.conversations
      FOR SELECT USING ( auth.uid() = ANY (participants) );

    -- Only participants can insert (both IDs must include current user)
    CREATE POLICY conversations_insert ON public.conversations
      FOR INSERT WITH CHECK ( auth.uid() = ANY (participants) );

    -- Allow updates (e.g. updated_at touches) only by participants
    CREATE POLICY conversations_update ON public.conversations
      FOR UPDATE USING ( auth.uid() = ANY (participants) )
      WITH CHECK ( auth.uid() = ANY (participants) );

    -- Helpful GIN index for participants array containment/equality lookups
    CREATE INDEX IF NOT EXISTS conversations_participants_gin_idx
      ON public.conversations USING gin (participants);
  END IF;
END $$;

-- NOTE: Service-role inserts (for initial creation) still succeed; RLS will be bypassed by service role key.
-- This migration fixes message loading returning 404 because conversations row was invisible under RLS.
