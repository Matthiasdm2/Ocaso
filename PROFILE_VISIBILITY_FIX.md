# Profiel Zichtbaarheid Fix - Complete Analyse

## Probleem
Profielpagina's zijn niet zichtbaar voor anonieme bezoekers wanneer ze op een naam klikken.

## Root Cause Analyse

### 1. RLS (Row Level Security) Policies
Het probleem ligt waarschijnlijk bij de RLS policies die niet correct zijn ingesteld voor anonieme gebruikers.

**Huidige situatie:**
- Er zijn meerdere migraties die policies proberen te maken
- Mogelijk conflicterende policies
- Policies mogelijk niet correct toegepast

### 2. Supabase Client Configuratie
- `supabaseServer()` gebruikt anon key - dit zou moeten werken voor anonieme gebruikers
- Maar cookies kunnen problemen veroorzaken als er geen session is

### 3. Error Handling
- Errors worden niet altijd duidelijk gelogd
- RLS errors worden mogelijk niet herkend

## Oplossing

### Stap 1: Voer de Comprehensive Migration uit
```bash
# Voer deze migratie uit:
supabase/migrations/20250105020000_comprehensive_profile_visibility_fix.sql
```

Deze migratie:
- Verwijdert alle bestaande SELECT policies
- Creëert een nieuwe `profiles_select_public` policy voor anonieme gebruikers
- Creëert een `profiles_select_authenticated` policy voor ingelogde gebruikers
- Verifieert dat alle policies correct zijn aangemaakt
- Test of anonieme toegang werkt

### Stap 2: Verifieer de Policies
Na het uitvoeren van de migratie, controleer in Supabase Dashboard:

1. Ga naar **Authentication** → **Policies**
2. Zoek naar de `profiles` tabel
3. Controleer dat je deze policies ziet:
   - `profiles_select_public` (FOR SELECT TO public)
   - `profiles_select_authenticated` (FOR SELECT TO authenticated)
   - `profiles_insert_own` (FOR INSERT TO authenticated)
   - `profiles_update_own` (FOR UPDATE TO authenticated)

### Stap 3: Test de Seller Pagina
1. Open een incognito venster (zodat je anoniem bent)
2. Ga naar `/seller/[user-id]` (vervang met een echte user ID)
3. Controleer de browser console voor errors
4. Controleer de server logs voor RLS errors

### Stap 4: Debugging
Als het nog steeds niet werkt:

1. **Check RLS Errors:**
   ```sql
   -- In Supabase SQL Editor, test als anonieme gebruiker:
   SET ROLE anon;
   SELECT id, full_name FROM profiles LIMIT 1;
   RESET ROLE;
   ```

2. **Check Policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname='public' 
   AND tablename='profiles';
   ```

3. **Check RLS Status:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname='public' 
   AND tablename='profiles';
   ```

## Migraties die je moet uitvoeren

### Vereist (in volgorde):
1. ✅ `20250105000000_fix_profile_data_flow.sql` - Fix data flow
2. ✅ `20250105020000_comprehensive_profile_visibility_fix.sql` - Fix RLS policies

### Optioneel (kan verwijderd worden):
- ❌ `20250105000000_allow_public_profile_reads.sql` - Duplicaat, wordt vervangen door comprehensive fix
- ❌ `20250105010000_ensure_public_profile_access.sql` - Duplicaat, wordt vervangen door comprehensive fix

## Verwachte Resultaten

Na het uitvoeren van de migraties:
- ✅ Anonieme gebruikers kunnen profielen lezen
- ✅ Seller pagina's zijn zichtbaar zonder login
- ✅ Alle relevante profielgegevens worden getoond
- ✅ Links naar seller profielen werken correct

## Troubleshooting

### Als profielen nog steeds niet zichtbaar zijn:

1. **Check Supabase Logs:**
   - Ga naar Supabase Dashboard → Logs
   - Zoek naar RLS errors
   - Check voor "permission denied" errors

2. **Test Direct Query:**
   ```sql
   -- Test als anonieme gebruiker
   SET ROLE anon;
   SELECT COUNT(*) FROM profiles;
   RESET ROLE;
   ```

3. **Check Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` moet correct zijn
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` moet correct zijn

4. **Check Browser Console:**
   - Open Developer Tools
   - Ga naar Console tab
   - Zoek naar Supabase errors

## Volgende Stappen

1. Voer de comprehensive migration uit
2. Test de seller pagina in incognito mode
3. Controleer logs voor errors
4. Als het werkt: verwijder de oude duplicaat migraties
5. Als het niet werkt: deel de error logs voor verdere debugging

