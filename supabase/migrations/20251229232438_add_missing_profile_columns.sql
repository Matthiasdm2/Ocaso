-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Add missing columns for business functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Add email column if it doesn't exist (for compatibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
