ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendcloud_parcel_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendcloud_tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendcloud_tracking_url TEXT;
