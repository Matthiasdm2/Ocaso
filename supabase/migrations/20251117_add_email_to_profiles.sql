-- Add email column to profiles table
-- This column is required by the handle_new_user trigger

alter table public.profiles add column email text;

-- Add index for email lookups
create index if not exists profiles_email_idx on public.profiles(email);
