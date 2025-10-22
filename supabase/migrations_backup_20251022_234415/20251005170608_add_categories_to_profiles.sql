-- Add categories column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'categories'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN categories text[] DEFAULT '{}';
  END IF;
END$$;

-- Create index for categories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'profiles_categories_idx'
  ) THEN
    CREATE INDEX profiles_categories_idx ON public.profiles USING gin (categories);
  END IF;
END$$;
