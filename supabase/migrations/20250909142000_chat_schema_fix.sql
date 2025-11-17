-- Fix migration: ensure messages table has required columns (conversation_id, sender_id, body, created_at)
-- Reason: previous environment contained an older messages table without conversation_id causing 42703 errors in prior migration.

DO $$
DECLARE
  has_table boolean;
  has_col boolean;
BEGIN
  -- Ensure conversations table exists (from previous migration); if not, create minimal form.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='conversations'
  ) INTO has_table;
  IF NOT has_table THEN
    EXECUTE 'create table public.conversations (
      id uuid primary key default gen_random_uuid(),
      participants uuid[] not null,
      listing_id uuid null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )';
  END IF;

  -- Ensure messages table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='messages'
  ) INTO has_table;
  IF NOT has_table THEN
    EXECUTE 'create table public.messages (
      id uuid primary key default gen_random_uuid(),
      conversation_id uuid references public.conversations(id) on delete cascade,
      sender_id uuid not null,
      body text not null,
      created_at timestamptz not null default now()
    )';
  END IF;

  -- conversation_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='conversation_id'
  ) INTO has_col;
  IF NOT has_col THEN
    EXECUTE 'alter table public.messages add column conversation_id uuid';
  END IF;

  -- sender_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='sender_id'
  ) INTO has_col;
  IF NOT has_col THEN
    EXECUTE 'alter table public.messages add column sender_id uuid';
  END IF;

  -- body
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='body'
  ) INTO has_col;
  IF NOT has_col THEN
    EXECUTE 'alter table public.messages add column body text';
  END IF;

  -- created_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='created_at'
  ) INTO has_col;
  IF NOT has_col THEN
    EXECUTE 'alter table public.messages add column created_at timestamptz default now()';
  END IF;

  -- Add FK if missing
  PERFORM 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype='f' AND conname='messages_conversation_id_fkey';
  IF NOT FOUND THEN
    -- Try to add FK (ignore errors if existing rows violate)
    BEGIN
      EXECUTE 'alter table public.messages
        add constraint messages_conversation_id_fkey
        foreign key (conversation_id) references public.conversations(id) on delete cascade';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add FK (will need manual cleanup): %', SQLERRM;
    END;
  END IF;

  -- Index (skip if column still null or missing)
  PERFORM 1 FROM pg_indexes WHERE schemaname='public' AND indexname='messages_conversation_id_created_at_idx';
  IF NOT FOUND THEN
    EXECUTE 'create index if not exists messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at desc)';
  END IF;
END $$;

-- Recreate policies safely (drop first) only if columns exist now
DO $$
DECLARE ok boolean; BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='conversation_id'
  ) INTO ok;
  IF ok THEN
    -- Enable RLS
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
    -- Policies
    DROP POLICY IF EXISTS messages_select ON public.messages;
    CREATE POLICY messages_select ON public.messages FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY (c.participants))
    );
    DROP POLICY IF EXISTS messages_insert ON public.messages;
    CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY (c.participants))
      AND auth.uid() = sender_id
    );
  END IF;
END $$;

-- NOTE: After deploying, ensure existing rows have conversation_id set; then enforce NOT NULL if desired:
-- alter table public.messages alter column conversation_id set not null;