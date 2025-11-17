-- Ensure public.bids emits realtime events via supabase_realtime publication
do $$ begin
  -- Add table to publication if not already included
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bids'
  ) then
    alter publication supabase_realtime add table public.bids;
  end if;
exception when undefined_object then
  -- Publication might not exist locally; ignore so migration remains idempotent in non-connected envs
  null;
end $$;

-- Optional but safe: set replica identity for updates/delete
do $$ begin
  perform 1 from information_schema.tables where table_schema='public' and table_name='bids';
  if found then
    execute 'alter table public.bids replica identity default'; -- PK is enough for inserts
  end if;
end $$;
