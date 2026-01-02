# Pre-flight Check voor Productie Deployment

Dit document beschrijft hoe je controleert of alles klaar staat om live te gaan.

## Snelle Check

Run het pre-flight check script:

```bash
npm run pre-flight-check
```

Of direct:

```bash
./scripts/pre-flight-check.sh
```

## Wat wordt gecontroleerd?

### 1. Supabase CLI
- ✅ Supabase CLI geïnstalleerd
- ✅ Project gelinkt aan Supabase

### 2. Vercel CLI
- ✅ Vercel CLI geïnstalleerd
- ✅ Ingelogd bij Vercel

### 3. Environment Variables
- ✅ `NEXT_PUBLIC_SUPABASE_URL` aanwezig
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` aanwezig
- ✅ `NEXT_PUBLIC_SITE_URL` aanwezig en HTTPS

### 4. Database Migrations
- ✅ Migraties bestaan
- ✅ Kritieke RLS policies aanwezig (profiles, listings)

### 5. Build Checks
- ✅ Build script aanwezig
- ✅ TypeScript check geslaagd

### 6. OAuth Configuration
- ✅ OAuth callback route bestaat
- ✅ Login pagina bestaat

### 7. Vercel Deployment
- ✅ Vercel project gelinkt
- ✅ Deployments gevonden

## Handmatige Checks

### Supabase Migraties

Check welke migraties nog niet zijn toegepast:

```bash
# List alle migraties
supabase migration list

# Check status
supabase db diff
```

### Vercel Environment Variables

Check of alle environment variables zijn ingesteld in Vercel:

```bash
# List alle environment variables
vercel env ls

# Check specifieke variable
vercel env pull .env.vercel
```

### Supabase RLS Policies

Check of RLS policies correct zijn ingesteld:

```sql
-- In Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  roles::text as roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### OAuth Configuratie

Controleer in Supabase Dashboard:

1. **Authentication → URL Configuration**
   - Site URL: `https://ocaso-rewrite.vercel.app` (of je productie URL)
   - Redirect URLs bevatten:
     - `https://ocaso-rewrite.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (voor lokaal)

2. **Authentication → Providers**
   - Google OAuth: Enabled, Client ID en Secret ingevuld
   - Facebook OAuth: Enabled, App ID en Secret ingevuld

3. **Google Cloud Console**
   - Authorized redirect URIs bevat: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`

4. **Facebook Developers**
   - Valid OAuth Redirect URIs bevat: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`

## Checklist voor Productie

- [ ] Pre-flight check script draait zonder kritieke errors
- [ ] Alle migraties zijn toegepast: `supabase migration up`
- [ ] TypeScript check geslaagd: `npm run typecheck`
- [ ] Build succesvol: `npm run build`
- [ ] Environment variables ingesteld in Vercel
- [ ] OAuth configuratie correct in Supabase Dashboard
- [ ] OAuth redirect URLs correct in Google/Facebook consoles
- [ ] RLS policies correct ingesteld
- [ ] Test deployment op staging (als beschikbaar)
- [ ] Smoke tests geslaagd

## Troubleshooting

### Supabase CLI niet gevonden
```bash
npm install -g supabase
```

### Vercel CLI niet gevonden
```bash
npm install -g vercel
```

### Migraties niet toegepast
```bash
# Link project eerst
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase migration up
```

### TypeScript errors
```bash
# Check errors
npm run typecheck

# Fix errors
npm run lint:fix
```

### OAuth werkt niet
1. Check Supabase Dashboard → Authentication → URL Configuration
2. Check of redirect URL exact overeenkomt
3. Check Google/Facebook console voor redirect URIs
4. Check browser console voor errors

## Na Deployment

Na het deployen naar productie:

1. Test OAuth login (Google/Facebook)
2. Test publieke listings (zonder login)
3. Test profiel pagina's (zonder login)
4. Check Vercel logs voor errors
5. Check Supabase logs voor RLS errors

