-- Create a public avatars bucket and basic policies (idempotent)
-- Bucket for user avatars, public read; authenticated users may upload/delete their own files

-- 1) Create bucket if missing
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Policies
-- Public read for avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read avatars'
  ) THEN
    CREATE POLICY "Public read avatars" ON storage.objects
      FOR SELECT USING ( bucket_id = 'avatars' );
  END IF;
END $$;

-- Authenticated upload into avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated upload avatars'
  ) THEN
    CREATE POLICY "Authenticated upload avatars" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK ( bucket_id = 'avatars' );
  END IF;
END $$;

-- Authenticated delete in avatars (loose; can be tightened with path owner rules later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete avatars'
  ) THEN
    CREATE POLICY "Authenticated delete avatars" ON storage.objects
      FOR DELETE TO authenticated
      USING ( bucket_id = 'avatars' );
  END IF;
END $$;
