-- Add main_photo column to listings table if it doesn't exist
-- This fixes the "Could not find the 'main_photo' column" error

DO $$
BEGIN
  -- Add main_photo column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'listings' 
    AND column_name = 'main_photo'
  ) THEN
    ALTER TABLE public.listings 
    ADD COLUMN main_photo text;
    
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
  END IF;
END $$;

