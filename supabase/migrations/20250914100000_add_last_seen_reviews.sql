-- Adds a column to track when user last viewed their incoming reviews
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_reviews_at timestamptz;
-- Optional index if querying often
CREATE INDEX IF NOT EXISTS profiles_last_seen_reviews_idx ON public.profiles (last_seen_reviews_at);
