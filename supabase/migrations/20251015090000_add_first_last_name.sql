-- Add first_name and last_name to profiles, backfill from full_name, and keep signup trigger compatible
begin;

-- 1) Add columns if not exist
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='first_name'
  ) then
    alter table public.profiles add column first_name text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='last_name'
  ) then
    alter table public.profiles add column last_name text;
  end if;
end $$;

-- 2) Backfill from full_name if blank
update public.profiles p
set first_name = coalesce(first_name, split_part(coalesce(full_name, ''), ' ', 1)),
    last_name  = coalesce(
      last_name,
      nullif(regexp_replace(coalesce(full_name, ''), '^[[:space:]]*([^[:space:]]+)[[:space:]]*', ''), '')
    );

-- 3) Update handle_new_user to also populate first/last name if provided
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  fn text := coalesce(new.raw_user_meta_data->>'first_name', '');
  ln text := coalesce(new.raw_user_meta_data->>'last_name', '');
  full_name_val text := coalesce(new.raw_user_meta_data->>'full_name',
                        nullif(trim(fn || ' ' || ln), ''), '');
begin
  insert into public.profiles (id, email, full_name, first_name, last_name)
  values (new.id, new.email, full_name_val, nullif(fn,''), nullif(ln,''))
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 4) Ensure trigger is in place
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

commit;
