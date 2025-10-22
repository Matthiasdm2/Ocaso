-- Make handle_new_user robust across environments (profiles may or may not have ocaso_credits)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Always create a basic profiles row
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  -- If the optional ocaso_credits column exists, grant a welcome credit
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'ocaso_credits'
  ) then
    execute 'update public.profiles set ocaso_credits = 1 where id = $1' using new.id;
  end if;
  return new;
end;
$$;

-- Recreate trigger to ensure it points at the latest function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
