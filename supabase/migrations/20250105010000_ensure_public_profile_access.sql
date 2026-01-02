-- Ensure public (anonymous) users can read profiles
-- This is critical for public seller/business profile pages

-- First, ensure RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

-- Drop existing public select policy if it exists (to recreate with correct syntax)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_public'
  ) THEN
    DROP POLICY profiles_select_public ON public.profiles;
  END IF;
END$$;

-- Create public select policy that allows anonymous users to read profiles
-- Using 'public' role means it applies to unauthenticated users
CREATE POLICY profiles_select_public ON public.profiles 
FOR SELECT 
TO public
USING (true);

-- Also ensure authenticated users can read profiles (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_all'
  ) THEN
    CREATE POLICY profiles_select_all ON public.profiles 
    FOR SELECT 
    TO authenticated 
    USING (true);
  END IF;
END$$;

-- Verify policies exist
DO $$
DECLARE
  public_policy_exists boolean;
  auth_policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_public'
  ) INTO public_policy_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_all'
  ) INTO auth_policy_exists;
  
  IF NOT public_policy_exists THEN
    RAISE EXCEPTION 'Failed to create profiles_select_public policy';
  END IF;
  
  IF NOT auth_policy_exists THEN
    RAISE EXCEPTION 'Failed to create profiles_select_all policy';
  END IF;
  
  RAISE NOTICE 'Profile RLS policies verified: public=% auth=%', public_policy_exists, auth_policy_exists;
END$$;

