-- Add trigger to give 1 credit to new users upon registration
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, ocaso_credits)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 1);
  return new;
end;
$$;

-- Trigger op auth.users voor nieuwe registraties
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
