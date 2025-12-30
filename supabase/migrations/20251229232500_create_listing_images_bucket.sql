-- Create listing-images storage bucket and policies
INSERT INTO storage.buckets (id, name, public)
SELECT 'listing-images', 'listing-images', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'listing-images');

-- Allow public read access to listing images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public read listing images') THEN
    CREATE POLICY "public read listing images" ON storage.objects
      FOR SELECT USING (bucket_id = 'listing-images');
  END IF;
END $$;

-- Allow authenticated users to upload listing images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated upload listing images') THEN
    CREATE POLICY "authenticated upload listing images" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images');
  END IF;
END $$;

-- Allow authenticated users to update their own listing images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated update listing images') THEN
    CREATE POLICY "authenticated update listing images" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'listing-images');
  END IF;
END $$;

-- Allow authenticated users to delete their own listing images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated delete listing images') THEN
    CREATE POLICY "authenticated delete listing images" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'listing-images');
  END IF;
END $$;
