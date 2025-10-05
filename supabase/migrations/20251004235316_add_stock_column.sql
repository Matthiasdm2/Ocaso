-- Voeg voorraad kolom toe aan listings tabel
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 1;

-- Update bestaande listings om een standaard voorraad te hebben (indien gewenst)
-- UPDATE public.listings SET stock = 1 WHERE stock IS NULL;

-- Index voor betere performance bij queries
CREATE INDEX IF NOT EXISTS listings_stock_idx ON public.listings (stock);
