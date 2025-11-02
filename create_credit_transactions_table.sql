-- Create credit_transactions table
-- =============================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, -- positive for aankoop, negative for gebruik
  transaction_type text not null check (transaction_type in ('purchase', 'usage')),
  description text,
  reference_id uuid, -- kan linken naar QR code of payment
  created_at timestamptz default now()
);

-- Indexen voor credit_transactions
create index if not exists credit_transactions_user_id_idx on public.credit_transactions (user_id);
create index if not exists credit_transactions_created_at_idx on public.credit_transactions (created_at desc);

-- RLS voor credit_transactions
alter table public.credit_transactions enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='credit_transactions_user_select'
  ) THEN
    CREATE POLICY "credit_transactions_user_select" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='credit_transactions_insert'
  ) THEN
    CREATE POLICY "credit_transactions_insert" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='credit_transactions_service_insert'
  ) THEN
    CREATE POLICY "credit_transactions_service_insert" ON public.credit_transactions FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
