-- Chat schema: conversations + messages with participants array
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participants uuid[] not null check (cardinality(participants) = 2),
  listing_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

-- Fast lookups
create index if not exists messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at desc);
create index if not exists conversations_updated_at_idx on public.conversations (updated_at desc);

-- Updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

-- RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies: only participants can select/insert
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select using (auth.uid() = any(participants));

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations for insert with check (auth.uid() = any(participants));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() = any(c.participants))
);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() = any(c.participants))
  and auth.uid() = sender_id
);

-- Realtime publication (only if publication exists); make idempotent
DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    -- add table if not already included
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      EXECUTE 'alter publication supabase_realtime add table public.messages';
    END IF;
  END IF;
END $$;
