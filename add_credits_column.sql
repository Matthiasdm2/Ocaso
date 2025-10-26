-- Add ocaso_credits column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ocaso_credits INTEGER DEFAULT 0;

-- Update existing profiles to have 0 credits if they don't have any
UPDATE public.profiles SET ocaso_credits = 0 WHERE ocaso_credits IS NULL;
