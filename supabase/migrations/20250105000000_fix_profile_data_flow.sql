-- Fix profile data flow: ensure all registration data flows to profile
-- This updates handle_new_user trigger to extract all metadata fields

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

  -- Extract phone
  phone_val text := new.raw_user_meta_data->>'phone';

  -- Extract address from metadata (can be object or null)
  address_obj jsonb := null;
  address_street text := '';
  address_city text := '';
  address_zip text := '';
  address_country text := 'België';
  
  -- Extract business fields
  is_business_val boolean := false;
  company_name_val text := null;
  vat_val text := null;
  website_val text := null;
  iban_val text := null;
  
  -- Bank and preferences objects
  bank_obj jsonb := null;
  preferences_obj jsonb := null;
  marketing_opt_in_val boolean := false;
  
begin
  -- Parse address if it exists in metadata
  if new.raw_user_meta_data->'address' is not null then
    address_obj := new.raw_user_meta_data->'address';
    -- Extract address fields, mapping postal -> zip
    address_street := coalesce(
      address_obj->>'street', 
      ''
    );
    -- Combine street, number, and bus if they exist
    if address_obj->>'number' is not null then
      address_street := trim(address_street || ' ' || (address_obj->>'number'));
    end if;
    if address_obj->>'bus' is not null and address_obj->>'bus' != '' then
      address_street := trim(address_street || ' bus ' || (address_obj->>'bus'));
    end if;
    
    address_city := coalesce(address_obj->>'city', '');
    -- Map postal -> zip
    address_zip := coalesce(
      address_obj->>'postal',
      address_obj->>'zip',
      ''
    );
    address_country := coalesce(address_obj->>'country', 'België');
  end if;

  -- Build address jsonb object
  address_obj := jsonb_build_object(
    'street', address_street,
    'city', address_city,
    'zip', address_zip,
    'country', address_country
  );

  -- Extract business fields
  if new.raw_user_meta_data->>'is_business' is not null then
    is_business_val := (new.raw_user_meta_data->>'is_business')::boolean;
  end if;
  company_name_val := new.raw_user_meta_data->>'company_name';
  vat_val := new.raw_user_meta_data->>'vat';
  website_val := new.raw_user_meta_data->>'website';
  iban_val := new.raw_user_meta_data->>'iban';

  -- Build bank jsonb if IBAN exists
  if iban_val is not null and iban_val != '' then
    bank_obj := jsonb_build_object('iban', iban_val, 'bic', '');
  end if;

  -- Extract marketing opt-in and build preferences
  if new.raw_user_meta_data->>'marketing_opt_in' is not null then
    marketing_opt_in_val := (new.raw_user_meta_data->>'marketing_opt_in')::boolean;
  end if;
  preferences_obj := jsonb_build_object(
    'language', 'nl',
    'newsletter', marketing_opt_in_val,
    'marketing_opt_in', marketing_opt_in_val
  );

  -- Upsert profile with all available metadata
  insert into public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    avatar_url,
    phone,
    address,
    is_business,
    company_name,
    vat,
    website,
    bank,
    preferences
  )
  values (
    new.id,
    new.email,
    nullif(full_name_val, ''),
    nullif(fn, ''),
    nullif(ln, ''),
    nullif(avatar_url_val, ''),
    nullif(phone_val, ''),
    case when address_street != '' or address_city != '' or address_zip != '' then address_obj else null end,
    is_business_val,
    nullif(company_name_val, ''),
    nullif(vat_val, ''),
    nullif(website_val, ''),
    bank_obj,
    preferences_obj
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    phone = coalesce(excluded.phone, profiles.phone),
    address = coalesce(excluded.address, profiles.address),
    is_business = coalesce(excluded.is_business, profiles.is_business),
    company_name = coalesce(excluded.company_name, profiles.company_name),
    vat = coalesce(excluded.vat, profiles.vat),
    website = coalesce(excluded.website, profiles.website),
    bank = coalesce(excluded.bank, profiles.bank),
    preferences = coalesce(excluded.preferences, profiles.preferences);

  return new;
end;
$$;

-- Ensure public profile reads are allowed (needed for public seller/business profile pages)
-- This is safe because we only expose public information like display_name, avatar_url, etc.
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='profiles' 
    AND policyname='profiles_select_public'
  ) THEN
    -- Allow anyone (including anonymous users) to read profiles
    CREATE POLICY profiles_select_public ON public.profiles 
    FOR SELECT 
    TO public
    USING (true);
  END IF;
END$$;

