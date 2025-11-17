-- Stripe Connect + Escrow base schema
-- 1) Add stripe_account_id to profiles (if not present)
-- 2) Create orders table to track payments and delayed releases
-- 3) Basic RLS policies

-- 1) Ensure column on profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_account_id'
  ) THEN
    -- already exists
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN stripe_account_id text UNIQUE;
  END IF;
END$$;

-- 2) orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'eur',
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  capture_after timestamptz,
  released_at timestamptz,
  protest_status text NOT NULL DEFAULT 'none' CHECK (protest_status IN ('none','filed','resolved')),
  sendcloud_status text,
  state text NOT NULL DEFAULT 'created' CHECK (state IN ('created','paid','requires_capture','captured','canceled','refunded','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_orders_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE RESTRICT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_state ON public.orders (state);
CREATE INDEX IF NOT EXISTS idx_orders_capture_after ON public.orders (capture_after);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'orders_set_updated_at'
  ) THEN
    CREATE TRIGGER orders_set_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 3) RLS policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own orders (as buyer or seller)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_select_own'
  ) THEN
    CREATE POLICY orders_select_own ON public.orders
      FOR SELECT TO authenticated
      USING (buyer_id = auth.uid() OR seller_id = auth.uid());
  END IF;
END$$;

-- By default, no insert/update/delete for authenticated (only service role or RPC)
-- If you need client-side inserts, create a secure RPC later.
