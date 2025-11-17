-- Optional default policies for message_attachments so only conversation participants can see related attachments
-- This assumes messages + conversations tables and policies exist as in prior migrations.
DO $$
DECLARE ok boolean;
BEGIN
  -- Only proceed if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='message_attachments'
  ) INTO ok;
  IF NOT ok THEN
    RAISE NOTICE 'Table public.message_attachments missing; skipping policies.';
    RETURN;
  END IF;

  -- Enable RLS (again, harmless if already enabled)
  EXECUTE 'alter table public.message_attachments enable row level security';

  -- Drop existing to be idempotent
  EXECUTE 'drop policy if exists message_attachments_select on public.message_attachments';
  EXECUTE 'drop policy if exists message_attachments_insert on public.message_attachments';

  -- Allow participants to read
  EXECUTE $policy$
    create policy message_attachments_select on public.message_attachments
    for select using (
      exists (
        select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.id = message_id and auth.uid() = any(c.participants)
      )
    )
  $policy$;

  -- Allow sender to attach files (insert)
  EXECUTE $policy$
    create policy message_attachments_insert on public.message_attachments
    for insert with check (
      exists (
        select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.id = message_id and auth.uid() = any(c.participants)
          and auth.uid() = m.sender_id
      )
    )
  $policy$;
END $$;
