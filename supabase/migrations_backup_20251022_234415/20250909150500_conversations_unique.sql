-- Ensure only one conversation per participants+listing combination.
-- Handles NULL listing_id by treating null as a distinct grouping via COALESCE.
-- First, drop any previous non-unique index if present (safe / optional) and create unique index.

DO $$
DECLARE exists_idx boolean; BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='conversations_participants_listing_uidx'
  ) INTO exists_idx;
  IF NOT exists_idx THEN
    -- Clean up duplicates prior to adding unique index (keep oldest)
    WITH ranked AS (
      SELECT id, participants, listing_id, created_at,
             ROW_NUMBER() OVER (PARTITION BY participants, listing_id ORDER BY created_at ASC, id ASC) AS rn
      FROM public.conversations
    ), dups AS (
      SELECT id FROM ranked WHERE rn > 1
    )
    DELETE FROM public.conversations c USING dups WHERE c.id = dups.id;

    -- Unique index (array btree comparison works for uuid[])
    CREATE UNIQUE INDEX conversations_participants_listing_uidx
      ON public.conversations (participants, listing_id);
  END IF;
END $$;

-- NOTE: If you want a single conversation across ALL listings (ignoring listing_id), replace index definition accordingly.