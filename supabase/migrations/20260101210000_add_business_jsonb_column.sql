-- Add business JSONB column to profiles table if it doesn't exist
-- This column stores subscription data: plan, billing_cycle, subscription_active, subscription_updated_at

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'business'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN business JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN public.profiles.business IS 'Business subscription data: plan, billing_cycle, subscription_active, subscription_updated_at';
  END IF;
END $$;

