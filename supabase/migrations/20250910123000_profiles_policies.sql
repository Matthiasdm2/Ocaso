-- Ensure RLS and self-update policies on public.profiles (idempotent)
DO $$
BEGIN
  -- Enable RLS if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'
  ) THEN
  EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

-- Allow selecting profiles for all authenticated users (needed for avatars/peer names)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_all'
  ) THEN
  EXECUTE 'CREATE POLICY profiles_select_all ON public.profiles FOR SELECT TO authenticated USING (true)';
  END IF;
END$$;

-- Allow users to insert their own profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own'
  ) THEN
  EXECUTE 'CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid())';
  END IF;
END$$;

-- Allow users to update their own profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own'
  ) THEN
  EXECUTE 'CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
  END IF;
END$$;
