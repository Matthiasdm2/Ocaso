-- Add category_id and subcategory_id to listings table
DO $$
BEGIN
  -- Add category_id (integer, references categories)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN category_id integer REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;

  -- Add subcategory_id (integer, references subcategories)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN subcategory_id integer REFERENCES public.subcategories(id) ON DELETE SET NULL;
  END IF;
END$$; 
