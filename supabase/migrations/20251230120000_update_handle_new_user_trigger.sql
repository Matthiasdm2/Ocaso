-- Update handle_new_user function to properly populate profile fields from auth metadata
-- including avatar_url and improved full_name priority handling

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  -- Full name priority: full_name -> name -> (first_name + last_name)
  full_name_val text := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    nullif(trim(
      coalesce(new.raw_user_meta_data->>'first_name', '') || ' ' ||
      coalesce(new.raw_user_meta_data->>'last_name', '')
    ), '')
  );

  -- Avatar URL priority: avatar_url -> picture
  avatar_url_val text := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  -- Extract first/last names if not explicitly provided
  fn text := coalesce(
    new.raw_user_meta_data->>'first_name',
    case
      when full_name_val is not null and position(' ' in full_name_val) > 0
      then split_part(full_name_val, ' ', 1)
      else ''
    end
  );

  ln text := coalesce(
    new.raw_user_meta_data->>'last_name',
    case
      when full_name_val is not null and position(' ' in full_name_val) > 0
      then substr(full_name_val, position(' ' in full_name_val) + 1)
      else ''
    end
  );
begin
  -- Upsert profile with all available metadata
  insert into public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    nullif(full_name_val, ''),
    nullif(fn, ''),
    nullif(ln, ''),
    nullif(avatar_url_val, '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);

  return new;
end;
$$;
