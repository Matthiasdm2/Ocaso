-- Ensure RLS is enabled on message_attachments (idempotent and safe if table missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
  ) THEN
    EXECUTE 'alter table public.message_attachments enable row level security';
  ELSE
    RAISE NOTICE 'Table public.message_attachments does not exist; skipping RLS enable.';
  END IF;
END $$;
