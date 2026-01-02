-- Fix main_photo column in listings table
-- This migration adds the missing main_photo column that is referenced in the codebase

-- Add main_photo column if it doesn't exist
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS main_photo text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_listings_main_photo
ON public.listings(main_photo);

-- Update existing listings to set main_photo from first image in array
-- Only if images array exists and main_photo is null
UPDATE public.listings
SET main_photo = CASE
  WHEN main_photo IS NULL AND array_length(images, 1) > 0
  THEN images[1]
  ELSE main_photo
END
WHERE main_photo IS NULL AND array_length(images, 1) > 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.listings.main_photo IS 'Main photo URL for the listing - derived from first image in images array if not explicitly set';

-- Grant permissions (should already be handled by RLS policies)
-- SELECT permission is handled by RLS policies
-- INSERT/UPDATE permissions are handled by RLS policies
