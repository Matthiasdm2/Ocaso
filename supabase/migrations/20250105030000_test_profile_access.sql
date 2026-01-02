-- Test script to verify profile access works for anonymous users
-- Run this in Supabase SQL Editor to diagnose issues

-- Step 1: Check if RLS is enabled
DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS is ENABLED on profiles table';
  ELSE
    RAISE WARNING '❌ RLS is NOT ENABLED on profiles table';
  END IF;
END$$;

-- Step 2: List all policies on profiles table
SELECT 
  policyname,
  cmd as command,
  roles::text as roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Step 3: Test as anonymous user (simulate what happens when unauthenticated)
DO $$
DECLARE
  profile_count integer;
  test_id uuid;
BEGIN
  -- Set role to anonymous
  SET ROLE anon;
  
  -- Try to count profiles
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  RAISE NOTICE '✅ Anonymous user can read profiles. Found % profiles', profile_count;
  
  -- Try to get a single profile
  SELECT id INTO test_id FROM public.profiles LIMIT 1;
  IF test_id IS NOT NULL THEN
    RAISE NOTICE '✅ Anonymous user can read individual profiles. Example ID: %', test_id;
  ELSE
    RAISE WARNING '❌ Anonymous user cannot read individual profiles (no profiles found or RLS blocking)';
  END IF;
  
  -- Reset role
  RESET ROLE;
EXCEPTION
  WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE EXCEPTION '❌ RLS POLICY ERROR: Anonymous user cannot read profiles. Check profiles_select_public policy.';
  WHEN OTHERS THEN
    RESET ROLE;
    RAISE EXCEPTION '❌ ERROR: %', SQLERRM;
END$$;

-- Step 4: Check if there are any profiles in the database
DO $$
DECLARE
  total_profiles integer;
BEGIN
  -- Reset to postgres role to bypass RLS for counting
  SET ROLE postgres;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  RESET ROLE;
  
  IF total_profiles > 0 THEN
    RAISE NOTICE '✅ Database contains % profiles', total_profiles;
  ELSE
    RAISE WARNING '⚠️  Database contains 0 profiles. This might be why profiles are not found.';
  END IF;
END$$;

-- Step 5: Show sample profile IDs (for testing)
SELECT 
  id,
  full_name,
  email,
  is_business,
  shop_slug,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Verify the specific policy exists
DO $$
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'profiles_select_public'
    AND cmd = 'SELECT'
    AND 'public' = ANY(roles)
  ) INTO policy_exists;
  
  IF policy_exists THEN
    RAISE NOTICE '✅ profiles_select_public policy exists and is configured for public role';
  ELSE
    RAISE EXCEPTION '❌ profiles_select_public policy is MISSING or MISCONFIGURED. Run migration 20250105020000_comprehensive_profile_visibility_fix.sql';
  END IF;
END$$;

