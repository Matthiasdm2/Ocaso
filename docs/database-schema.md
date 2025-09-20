# Database Schema & Policies (Supabase)

Deze documentatie beschrijft de minimale structuur die overeenkomt met de huidige codebase.
Pas aan waar je al bestaande tabellen/kolommen hebt. Gebruik ALTER TABLE voor toevoegingen.

## Overzicht Tabellen

- profiles
- listings
- reviews
- conversations
- messages
- listing_bid_reads
- storage buckets: business-logos, business-covers

---

## 1. profiles

Bevat zowel normale gebruiker als zakelijke velden.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  address jsonb default '{"street":"","city":"","zip":"","country":"België"}',
  preferences jsonb default '{"language":"nl","newsletter":false}',
  notifications jsonb default '{"newMessages":true,"bids":true,"priceDrops":true,"tips":true}',
  is_business boolean default false,
  company_name text,
  vat text,
  registration_nr text,
  website text,
  invoice_email text,
  bank jsonb default '{"iban":"","bic":""}',
  invoice_address jsonb default '{"street":"","city":"","zip":"","country":"België"}',
  shop_name text,
  shop_slug text unique,
  business_logo_url text,
  business_banner_url text,
  business_bio text,
  social_instagram text,
  social_facebook text,
  social_tiktok text,
  public_show_email boolean default false,
  public_show_phone boolean default false,
  categories text[] default '{}',
  business_plan text default 'basic',
  subscription_active boolean default false,
  rating numeric,
  review_count integer,
  avg_rating numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Trigger updated_at (optioneel):

```sql
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger trg_profiles_touch
before update on public.profiles
for each row execute function public.touch_updated_at();
```

RLS & policies:

```sql
alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using ( true ); -- eventueel beperken

create policy "profiles_update_self" on public.profiles
  for update using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "profiles_insert_self" on public.profiles
  for insert with check ( auth.uid() = id );
```

Indices (optioneel voor zoeken):

```sql
create index profiles_company_name_idx on public.profiles (company_name);
create index profiles_shop_name_idx on public.profiles (shop_name);
create index profiles_categories_idx on public.profiles using gin (categories);
```

---

## 2. listings

```sql
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  thumb text,
  main_photo text,
  images text[] default '{}',
  status text default 'active',
  metrics jsonb,
  created_at timestamptz default now()
);

alter table public.listings enable row level security;

create policy "listings_select_all" on public.listings for select using ( true );
create policy "listings_insert_owner" on public.listings for insert with check ( auth.uid() = seller_id );
create policy "listings_update_owner" on public.listings for update using ( auth.uid() = seller_id ) with check ( auth.uid() = seller_id );
```

Indices (optioneel):

```sql
create index listings_seller_idx on public.listings (seller_id);
create index listings_status_idx on public.listings (status);
```

---

## 3. reviews

```sql
create table public.reviews (
  id bigserial primary key,
  business_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
create index reviews_business_idx on public.reviews (business_id);
create index reviews_user_idx on public.reviews (user_id);

create policy "reviews_select_all" on public.reviews for select using ( true );
create policy "reviews_insert_auth" on public.reviews for insert with check ( auth.role() = 'authenticated' );
create policy "reviews_update_self" on public.reviews for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
create policy "reviews_delete_self" on public.reviews for delete using ( auth.uid() = user_id );
```

Rating cache trigger (optioneel):

```sql
create or replace function public.refresh_business_rating(biz uuid)
returns void language sql as $$
  update public.profiles p
    set rating = sub.avg_rating,
        review_count = sub.cnt
  from (
    select business_id, avg(rating)::numeric as avg_rating, count(*) as cnt
    from public.reviews
    where business_id = biz
    group by business_id
  ) sub
  where p.id = sub.business_id;
$$;

create or replace function public.on_review_change()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.refresh_business_rating(old.business_id);
  else
    perform public.refresh_business_rating(new.business_id);
  end if;
  return null;
end;$$;

create trigger trg_reviews_refresh
after insert or update or delete on public.reviews
for each row execute function public.on_review_change();
```

---

## 4. conversations

```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz default now()
);

create index conversations_parties_idx on public.conversations (seller_id, buyer_id);
create index conversations_listing_idx on public.conversations (listing_id);

alter table public.conversations enable row level security;
create policy "conversations_participant_select" on public.conversations for select using ( auth.uid() in (seller_id, buyer_id) );
create policy "conversations_insert" on public.conversations for insert with check ( auth.uid() in (seller_id, buyer_id) );
```

Optional unieke combinatie (voorkomt duplicates):

```sql
create unique index conversations_unique_pair on public.conversations (seller_id, buyer_id, listing_id);
```

---

## 5. messages

```sql
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text default '',
  created_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;

create policy "messages_select_participants" on public.messages for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.seller_id, c.buyer_id)
  )
);
create policy "messages_insert_participant" on public.messages for insert with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.seller_id, c.buyer_id)
  )
);
create policy "messages_update_sender" on public.messages for update using ( auth.uid() = sender_id ) with check ( auth.uid() = sender_id );
```

---

## 6. listing_bid_reads

```sql
create table public.listing_bid_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  last_seen_count int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, listing_id)
);

create index listing_bid_reads_listing_idx on public.listing_bid_reads (listing_id);

alter table public.listing_bid_reads enable row level security;
create policy "bid_reads_select_self" on public.listing_bid_reads for select using ( auth.uid() = user_id );
create policy "bid_reads_upsert_self" on public.listing_bid_reads for insert with check ( auth.uid() = user_id );
create policy "bid_reads_update_self" on public.listing_bid_reads for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
```

Timestamp trigger (optioneel):

```sql
create or replace function public.touch_listing_bid_reads()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger trg_bid_reads_touch
before update on public.listing_bid_reads
for each row execute function public.touch_listing_bid_reads();
```

---

## 7. Storage Buckets

Benodigd: `business-logos`, `business-covers`.

Policies (als bucket niet op public staat):

```sql
create policy "public read logos" on storage.objects
  for select using ( bucket_id in ('business-logos','business-covers') );
create policy "auth insert logos" on storage.objects
  for insert to authenticated with check ( bucket_id in ('business-logos','business-covers') );
create policy "auth update logos" on storage.objects
  for update to authenticated using ( bucket_id in ('business-logos','business-covers') ) with check ( bucket_id in ('business-logos','business-covers') );
create policy "auth delete logos" on storage.objects
  for delete to authenticated using ( bucket_id in ('business-logos','business-covers') );
```

---

## 8. Aanvullende optimalisaties (optioneel)

- Materialized view voor top businesses.
- Cron job (pg_cron) om orphaned storage files op te ruimen.
- Constraint dat `shop_slug` alleen gevuld mag zijn als `is_business=true` (check constraint).

```sql
alter table public.profiles
  add constraint shop_slug_requires_business
  check (shop_slug is null or is_business is true);
```

## 9. Migratie strategie

1. Maak backup.
2. Voeg nieuwe kolommen toe met ALTER TABLE.
3. Vul bestaande data voor nieuwe not-null kolommen (indien nodig) met defaults.
4. Activeer RLS pas nadat policies bestaan om lockout te vermijden.

---

Laatste update: (vul datum in)

```

```
