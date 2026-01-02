# Supabase Cloud Configuration Check (Zonder Docker)

Als je Docker niet hebt draaien, kun je de Supabase cloud configuratie nog steeds checken via het dashboard en SQL scripts.

## Snelle Check (Zonder Docker)

```bash
npm run check-supabase
```

Of gebruik de no-docker versie:
```bash
./scripts/check-supabase-cloud-no-docker.sh
```

## Handmatige Checks via Supabase Dashboard

### 1. Database Migraties

1. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/database/migrations
2. Controleer of alle migraties zijn toegepast
3. Belangrijke migraties om te verifiëren:
   - ✅ `20250106000000_add_bio_column.sql` - Voegt bio kolom toe
   - ✅ `20250106010000_fix_listings_public_access.sql` - Fix listings RLS

### 2. RLS Policies Check

1. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
2. Kopieer en plak de inhoud van `scripts/check-supabase-rls.sql`
3. Run het script
4. Controleer de output

**Verwachte output:**
- ✅ RLS enabled op alle kritieke tabellen
- ✅ `profiles_select_public` policy bestaat
- ✅ `listings_select_policy` policy bestaat
- ✅ `categories_select_public` policy bestaat
- ✅ Anonymous access test werkt

### 3. Authentication → URL Configuration

1. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/url-configuration

**Controleer:**
- ✅ **Site URL**: `https://ocaso-rewrite.vercel.app` (of je productie URL)
- ✅ **Redirect URLs** bevatten:
  - `https://ocaso-rewrite.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

### 4. Authentication → Providers

1. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/providers

**Google OAuth:**
- ✅ Enabled: **Aan**
- ✅ Client ID: Ingevuld
- ✅ Client Secret: Ingevuld

**Facebook OAuth:**
- ✅ Enabled: **Aan**
- ✅ App ID: Ingevuld
- ✅ App Secret: Ingevuld

### 5. Database Schema Check

Run dit SQL in SQL Editor:

```sql
-- Check kritieke kolommen
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('bio', 'business_plan'))
    OR (table_name = 'listings' AND column_name = 'status')
  )
ORDER BY table_name, column_name;
```

**Verwachte output:**
- ✅ `profiles.bio` (text)
- ✅ `profiles.business_plan` (text)
- ✅ `listings.status` (text)

## External OAuth Configuration

### Google Cloud Console

1. Ga naar: https://console.cloud.google.com/apis/credentials
2. Selecteer je OAuth 2.0 Client ID
3. Controleer **Authorized redirect URIs**:
   - ✅ Moet bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`

### Facebook Developers

1. Ga naar: https://developers.facebook.com/apps
2. Selecteer je app
3. Ga naar **Facebook Login** → **Settings**
4. Controleer **Valid OAuth Redirect URIs**:
   - ✅ Moet bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`

## Troubleshooting

### Docker Error

Als je deze fout ziet:
```
Cannot connect to the Docker daemon
```

**Oplossing:**
- Gebruik `check-supabase-cloud-no-docker.sh` script
- Of check handmatig via Supabase Dashboard
- Docker is alleen nodig voor lokale development, niet voor cloud checks

### Project Niet Gelinkt

Als Supabase CLI zegt dat er geen project gelinkt is:

1. **Via Dashboard:**
   - Ga naar Supabase Dashboard
   - Kopieer Project Reference ID
   - Run: `supabase link --project-ref YOUR_PROJECT_REF`

2. **Of skip CLI:**
   - Gebruik alleen Supabase Dashboard voor checks
   - CLI is optioneel voor cloud configuratie checks

## Complete Checklist

- [ ] Alle migraties zijn toegepast (check Dashboard)
- [ ] RLS policies zijn correct (run SQL script)
- [ ] Kritieke kolommen bestaan (bio, business_plan)
- [ ] Site URL is correct ingesteld
- [ ] Redirect URLs zijn correct ingesteld
- [ ] Google OAuth is geconfigureerd
- [ ] Facebook OAuth is geconfigureerd
- [ ] Google Cloud Console redirect URI is ingesteld
- [ ] Facebook Developers redirect URI is ingesteld

## Volgende Stappen

Na het verifiëren van alle configuratie:

1. ✅ Alles gecontroleerd? → Deploy naar Vercel
2. ❌ Problemen gevonden? → Los op voordat je deployt
3. ⚠️ Onzeker? → Test eerst op staging

