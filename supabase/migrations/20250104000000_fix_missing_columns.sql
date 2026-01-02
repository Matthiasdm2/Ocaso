-- Fix missing columns that are causing 400 errors
-- Created: 2025-01-04
-- Purpose: Add missing phone column to profiles and business_id to reviews if they don't exist

-- Add phone column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    COMMENT ON COLUMN public.profiles.phone IS 'Phone number for user contact';
  END IF;
END $$;

-- Add business_id column to reviews if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    COMMENT ON COLUMN public.reviews.business_id IS 'Business profile ID for business reviews';
    
    -- Create index for business_id lookups
    CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
  END IF;
END $$;

-- Add author_id column to reviews if it doesn't exist (some schemas use reviewer_id, others use author_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'author_id'
  ) THEN
    -- Check if reviewer_id exists and copy data, or create new column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'reviews' 
      AND column_name = 'reviewer_id'
    ) THEN
      -- Add author_id and copy data from reviewer_id
      ALTER TABLE public.reviews ADD COLUMN author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
      UPDATE public.reviews SET author_id = reviewer_id WHERE author_id IS NULL AND reviewer_id IS NOT NULL;
    ELSE
      -- Just add the column
      ALTER TABLE public.reviews ADD COLUMN author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Create index for author_id lookups
    CREATE INDEX IF NOT EXISTS idx_reviews_author_id ON public.reviews(author_id);
  END IF;
END $$;

-- Ensure first_name and last_name columns exist in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
  END IF;
END $$;

