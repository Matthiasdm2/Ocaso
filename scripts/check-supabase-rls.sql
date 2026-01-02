-- SQL Script om RLS policies te checken in Supabase Cloud
-- Run dit in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new

-- 1. Check of RLS is enabled op kritieke tabellen
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'listings', 'categories', 'subcategories', 'reviews', 'messages', 'conversations')
ORDER BY tablename;

-- 2. List alle RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  roles::text as roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check specifieke kritieke policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles::text as roles
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'profiles' AND policyname = 'profiles_select_public')
    OR (tablename = 'listings' AND policyname = 'listings_select_policy')
    OR (tablename = 'categories' AND policyname = 'categories_select_public')
    OR (tablename = 'subcategories' AND policyname = 'subcategories_select_public')
  )
ORDER BY tablename;

-- 4. Test anonymous access (simuleer anonieme gebruiker)
-- Dit moet werken zonder errors
SET ROLE anon;
SELECT COUNT(*) as profiles_count FROM public.profiles LIMIT 1;
SELECT COUNT(*) as listings_count FROM public.listings WHERE status = 'actief' LIMIT 1;
SELECT COUNT(*) as categories_count FROM public.categories LIMIT 1;
RESET ROLE;

-- 5. Check of kritieke kolommen bestaan
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('bio', 'business_plan', 'is_business'))
    OR (table_name = 'listings' AND column_name IN ('status', 'seller_id', 'category_id'))
  )
ORDER BY table_name, column_name;

-- 6. Check of conversation_overview functie bestaat
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'conversation_overview';

