-- Setup script for chat attachments bucket
-- Idempotent creation of public bucket + minimal policies

-- 1. Create bucket (public)
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- 2. Policies (wrapped in DO blocks so reruns are safe)
-- Public read
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Public read chat attachments'
  ) then
    create policy "Public read chat attachments" on storage.objects
      for select using ( bucket_id = 'chat-attachments' );
  end if;
end$$;

-- Authenticated insert (all logged-in users may upload). Optionally refine path rules later.
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Authenticated upload chat attachments'
  ) then
    create policy "Authenticated upload chat attachments" on storage.objects
      for insert to authenticated with check ( bucket_id = 'chat-attachments' );
  end if;
end$$;

-- (Optional) Allow delete by authenticated users for now (can tighten later)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Authenticated delete chat attachments'
  ) then
    create policy "Authenticated delete chat attachments" on storage.objects
      for delete to authenticated using ( bucket_id = 'chat-attachments' );
  end if;
end$$;

-- NOTE: Update policy omitted (immutable uploads). Add if needed.

-- After running: verify in Dashboard > Storage.
