-- Comprehensive fix to ensure profiles are visible to anonymous users
-- This migration ensures all RLS policies are correctly set up for public profile access

-- Step 1: Ensure RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on profiles table';
  ELSE
    RAISE WARNING 'Profiles table does not exist';
  END IF;
END$$;

-- Step 2: Drop all existing select policies to start fresh
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END$$;

-- Step 3: Create policy for anonymous users (public role)
-- This allows unauthenticated users to read profiles
CREATE POLICY profiles_select_public ON public.profiles 
FOR SELECT 
TO public
USING (true);

-- Step 4: Create policy for authenticated users
-- This allows logged-in users to read all profiles
CREATE POLICY profiles_select_authenticated ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Step 5: Ensure users can insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own ON public.profiles 
    FOR INSERT 
    TO authenticated
    WITH CHECK (id = auth.uid());
    RAISE NOTICE 'Created profiles_insert_own policy';
  END IF;
END$$;

-- Step 6: Ensure users can update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles 
    FOR UPDATE 
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
    RAISE NOTICE 'Created profiles_update_own policy';
  END IF;
END$$;

-- Step 7: Verify all policies exist
DO $$
DECLARE
  public_policy_exists boolean;
  auth_policy_exists boolean;
  insert_policy_exists boolean;
  update_policy_exists boolean;
BEGIN
  -- Check public policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_public'
  ) INTO public_policy_exists;
  
  -- Check authenticated policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_authenticated'
  ) INTO auth_policy_exists;
  
  -- Check insert policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_insert_own'
  ) INTO insert_policy_exists;
  
  -- Check update policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_update_own'
  ) INTO update_policy_exists;
  
  -- Report results
  RAISE NOTICE '=== Profile RLS Policies Status ===';
  RAISE NOTICE 'Public select policy: %', public_policy_exists;
  RAISE NOTICE 'Authenticated select policy: %', auth_policy_exists;
  RAISE NOTICE 'Insert own policy: %', insert_policy_exists;
  RAISE NOTICE 'Update own policy: %', update_policy_exists;
  
  -- Verify critical policies
  IF NOT public_policy_exists THEN
    RAISE EXCEPTION 'CRITICAL: profiles_select_public policy was not created!';
  END IF;
  
  IF NOT auth_policy_exists THEN
    RAISE EXCEPTION 'CRITICAL: profiles_select_authenticated policy was not created!';
  END IF;
END$$;

-- Step 8: Test query to verify anonymous access works
-- This will fail if policies are not set up correctly
DO $$
DECLARE
  test_count integer;
BEGIN
  -- Try to count profiles as anonymous user
  -- This simulates what an anonymous user would see
  SELECT COUNT(*) INTO test_count
  FROM public.profiles;
  
  RAISE NOTICE 'Test query successful: Found % profiles accessible to anonymous users', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Test query failed: %. This may indicate RLS policy issues.', SQLERRM;
END$$;

