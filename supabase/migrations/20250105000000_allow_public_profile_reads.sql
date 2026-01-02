-- Allow anonymous users to read profiles (needed for public seller/business profile pages)
-- This is safe because we only expose public information like display_name, avatar_url, etc.
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_public'
  ) THEN
    -- Allow anyone (including anonymous users) to read profiles
    CREATE POLICY profiles_select_public ON public.profiles 
    FOR SELECT 
    TO public
    USING (true);
  END IF;
END$$;

