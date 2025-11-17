ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sendcloud_public_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sendcloud_secret_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sendcloud_default_shipping_method INTEGER;
