-- Ensure favorites table exists and has RLS with owner-only policies; add helpful indexes and realtime publication (idempotent)
DO $$
DECLARE has_table boolean; BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='favorites'
  ) INTO has_table;
  IF NOT has_table THEN
    -- Create minimal favorites table if missing (adjust types to your schema)
    EXECUTE 'create table public.favorites (
      listing_id uuid not null,
      user_id uuid not null,
      created_at timestamptz not null default now(),
      primary key (listing_id, user_id)
    )';
  END IF;
END $$;

-- Enable RLS
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='favorites';
  IF FOUND THEN
    EXECUTE 'alter table public.favorites enable row level security';
  END IF;
END $$;

-- Policies: users manage only their own favorites rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites_select_own'
  ) THEN
    EXECUTE 'create policy favorites_select_own on public.favorites for select using (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites_insert_own'
  ) THEN
    EXECUTE 'create policy favorites_insert_own on public.favorites for insert with check (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorites' AND policyname='favorites_delete_own'
  ) THEN
    EXECUTE 'create policy favorites_delete_own on public.favorites for delete using (auth.uid() = user_id)';
  END IF;
END $$;

-- Helpful index for counts per listing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='favorites' AND indexname='favorites_listing_idx'
  ) THEN
    EXECUTE 'create index favorites_listing_idx on public.favorites (listing_id)';
  END IF;
END $$;

-- Helpful index for user lookups (profile favorites page)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='favorites' AND indexname='favorites_user_idx'
  ) THEN
    EXECUTE 'create index favorites_user_idx on public.favorites (user_id)';
  END IF;
END $$;

-- Add foreign key to listings for implicit PostgREST relationship (if not present)
DO $$
DECLARE has_fk boolean; BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema='public' AND tc.table_name='favorites' AND tc.constraint_type='FOREIGN KEY'
      AND tc.constraint_name='favorites_listing_id_fkey'
  ) INTO has_fk;
  IF NOT has_fk THEN
    BEGIN
      EXECUTE 'alter table public.favorites add constraint favorites_listing_id_fkey foreign key (listing_id) references public.listings(id) on delete cascade';
    EXCEPTION WHEN others THEN
      -- If existing data violates the FK, skip; the app falls back to two-step fetch.
      RAISE NOTICE 'Could not add favorites_listing_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- Add to realtime publication if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'favorites'
    ) THEN
      EXECUTE 'alter publication supabase_realtime add table public.favorites';
    END IF;
  END IF;
END $$;
