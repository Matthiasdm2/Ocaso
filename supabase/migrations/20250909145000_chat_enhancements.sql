-- Chat enhancements: edits, deletes, attachments, flags, performance
alter table public.messages add column if not exists edited_at timestamptz null;
alter table public.messages add column if not exists deleted_at timestamptz null;

create index if not exists messages_sender_created_at_idx on public.messages (sender_id, created_at desc);
create index if not exists messages_conversation_created_at_idx on public.messages (conversation_id, created_at asc);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  mime_type text null,
  size_bytes int4 null,
  created_at timestamptz not null default now()
);
create index if not exists message_attachments_message_id_idx on public.message_attachments(message_id);
alter table public.message_attachments enable row level security;

-- Recreate conversation_overview with correct column order and complete body
-- Need to drop first because we changed the OUT columns (return type)
drop function if exists public.conversation_overview();
create or replace function public.conversation_overview()
returns table (
  id uuid,
  participants uuid[],
  updated_at timestamptz,
  last_message_id uuid,
  last_message_body text,
  last_message_created_at timestamptz,
  last_message_sender uuid,
  unread_count int,
  listing_id uuid
) language sql stable
security definer
set search_path = public as $$
  select
    c.id,
    c.participants,
    c.updated_at,
    lm.id as last_message_id,
    case when lm.deleted_at is not null then '[verwijderd]' else lm.body end as last_message_body,
    lm.created_at as last_message_created_at,
    lm.sender_id as last_message_sender,
    coalesce(
      (
        select count(*)
        from public.messages m2
        left join public.conversation_reads cr
          on cr.conversation_id = c.id
         and cr.user_id = auth.uid()
        where m2.conversation_id = c.id
          and m2.sender_id <> auth.uid()
          and (cr.last_read_at is null or m2.created_at > cr.last_read_at)
          and m2.deleted_at is null
      ), 0
    ) as unread_count,
    c.listing_id
  from public.conversations c
  left join lateral (
    select m.*
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() = any(c.participants)
  order by c.updated_at desc;
$$;

-- Optional: ensure typical roles can execute
grant execute on function public.conversation_overview() to anon, authenticated;
