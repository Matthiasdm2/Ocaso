-- Create storage buckets for business media
insert into storage.buckets (id, name, public)
select 'business-logos','business-logos', true
where not exists (select 1 from storage.buckets where id='business-logos');

insert into storage.buckets (id, name, public)
select 'business-covers','business-covers', true
where not exists (select 1 from storage.buckets where id='business-covers');

-- Policies (idempotent: drop if exist pattern not needed if names unique)
-- Allow public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public read business logos') THEN
    CREATE POLICY "public read business logos" ON storage.objects
      FOR SELECT USING ( bucket_id = 'business-logos' );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public read business covers') THEN
    CREATE POLICY "public read business covers" ON storage.objects
      FOR SELECT USING ( bucket_id = 'business-covers' );
  END IF;
END $$;

-- Authenticated upload/update/delete restricted to own folder (user id prefix) optional
-- Adjust path rule if you want stricter enforcement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth upload business logos') THEN
    CREATE POLICY "auth upload business logos" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'business-logos' );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth upload business covers') THEN
    CREATE POLICY "auth upload business covers" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'business-covers' );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth update business logos') THEN
    CREATE POLICY "auth update business logos" ON storage.objects
      FOR UPDATE TO authenticated USING ( bucket_id = 'business-logos' );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth update business covers') THEN
    CREATE POLICY "auth update business covers" ON storage.objects
      FOR UPDATE TO authenticated USING ( bucket_id = 'business-covers' );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth delete business logos') THEN
    CREATE POLICY "auth delete business logos" ON storage.objects
      FOR DELETE TO authenticated USING ( bucket_id = 'business-logos' );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth delete business covers') THEN
    CREATE POLICY "auth delete business covers" ON storage.objects
      FOR DELETE TO authenticated USING ( bucket_id = 'business-covers' );
  END IF;
END $$;

-- Optional tighter path ownership (uncomment if RLS needs per-user path enforcement)
-- and add column metadata or path pattern check using left(name,36)=auth.uid()::text
-- Example:
-- alter policy "auth upload business logos" on storage.objects using (true) with check (
--   bucket_id='business-logos' and (position(auth.uid()::text in name)=1)
-- );
