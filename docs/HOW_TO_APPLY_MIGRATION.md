# Hoe de Database Migratie Uitvoeren

## Wat doet deze migratie?

Voegt een nieuwe kolom `business` (JSONB) toe aan de `profiles` tabel voor subscription data opslag.

## Migratie SQL

```sql
-- Add business JSONB column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'business'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN business JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN public.profiles.business IS 'Business subscription data: plan, billing_cycle, subscription_active, subscription_updated_at';
  END IF;
END $$;
```

## Methoden om Migratie Uit te Voeren

### ✅ Methode 1: Supabase Dashboard (Aanbevolen - Meest Eenvoudig)

1. **Ga naar Supabase Dashboard**
   - https://supabase.com/dashboard
   - Log in met je account

2. **Selecteer je project**
   - Kies het project waar je de migratie wilt uitvoeren

3. **Open SQL Editor**
   - Klik op "SQL Editor" in de linker sidebar

4. **Voer migratie uit**
   - Kopieer de SQL hierboven
   - Plak in de SQL Editor
   - Klik op "Run" of druk op `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

5. **Verifieer**
   - Je zou "Success. No rows returned" moeten zien
   - Of controleer via Table Editor → profiles → kolom "business" bestaat

### ✅ Methode 2: Via psql (Als je DATABASE_URL hebt)

```bash
# Zet DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Voer migratie uit
psql $DATABASE_URL -f supabase/migrations/20260101210000_add_business_jsonb_column.sql
```

Of direct:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/20260101210000_add_business_jsonb_column.sql
```

### ✅ Methode 3: Via Supabase CLI (Als project gelinkt is)

```bash
# Link project (als nog niet gedaan)
supabase link --project-ref [YOUR_PROJECT_REF]

# Push migraties
supabase db push
```

### ✅ Methode 4: Via npm script (Als DATABASE_URL beschikbaar is)

```bash
npm run migrate:apply
```

Dit voert alle migraties in `supabase/migrations` uit.

## Verificatie

Na het uitvoeren van de migratie, controleer of de kolom bestaat:

```sql
-- Check of kolom bestaat
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'business';
```

Je zou moeten zien:
- `column_name`: `business`
- `data_type`: `jsonb`
- `column_default`: `'{}'::jsonb`

## Veiligheid

✅ **Deze migratie is veilig:**
- Idempotent (kan meerdere keren worden uitgevoerd)
- Voegt alleen een kolom toe (verwijdert niets)
- Default waarde voor bestaande rijen
- Geen downtime

## Troubleshooting

### "Column already exists"
- Dit is OK! De migratie is al uitgevoerd.
- Je kunt doorgaan met deployment.

### "Permission denied"
- Zorg dat je de juiste database credentials gebruikt
- Service role key heeft meestal alle rechten

### "Connection refused"
- Controleer DATABASE_URL
- Controleer firewall/netwerk instellingen

## Na de Migratie

Na het uitvoeren van de migratie:
1. ✅ Code deployment kan doorgaan
2. ✅ Subscription flow werkt correct
3. ✅ Admin dashboard kan subscriptions beheren
4. ✅ Beide kolommen (`business_plan` + `business`) worden gesynchroniseerd

