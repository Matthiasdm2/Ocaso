-- Unread tracking for conversations
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists conversation_reads_select on public.conversation_reads;
create policy conversation_reads_select on public.conversation_reads for select using (auth.uid() = user_id);

drop policy if exists conversation_reads_insert on public.conversation_reads;
create policy conversation_reads_insert on public.conversation_reads for insert with check (auth.uid() = user_id);

drop policy if exists conversation_reads_update on public.conversation_reads;
create policy conversation_reads_update on public.conversation_reads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists conversation_reads_user_id_idx on public.conversation_reads (user_id);