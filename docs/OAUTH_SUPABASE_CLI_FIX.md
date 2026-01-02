# OAuth Fix via Supabase Dashboard

Helaas kan de Supabase CLI de auth configuratie in de cloud niet direct updaten. Je moet dit handmatig doen via het Supabase Dashboard.

## Stap 1: Update Supabase Dashboard Configuratie

### A. Authentication → URL Configuration

1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/url-configuration

2. **Site URL**: 
   - Voor lokaal testen: `http://localhost:3000`
   - Voor productie: `https://ocaso.be`

3. **Redirect URLs** (voeg deze toe):
   ```
   http://localhost:3000/auth/callback
   https://ocaso.be/auth/callback
   https://ocaso-rewrite.vercel.app/auth/callback
   ```

### B. Authentication → Providers

1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers

2. **Google OAuth**:
   - Klik op "Google"
   - Zorg dat het enabled is
   - Vul Client ID en Secret in (van Google Cloud Console)
   - Sla op

3. **Facebook OAuth**:
   - Klik op "Facebook"
   - Zorg dat het enabled is
   - Vul App ID en Secret in (van Facebook Developers)
   - Sla op

## Stap 2: Update Google Cloud Console

1. Ga naar: https://console.cloud.google.com/apis/credentials

2. Selecteer je OAuth 2.0 Client ID

3. Voeg toe aan **Authorized redirect URIs**:
   ```
   https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
   ```

4. Sla op

## Stap 3: Update Facebook App Settings

1. Ga naar: https://developers.facebook.com/apps

2. Selecteer je app

3. Ga naar **Facebook Login** → **Settings**

4. Voeg toe aan **Valid OAuth Redirect URIs**:
   ```
   https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
   ```

5. Sla op

## Stap 4: Test

1. Start je lokale server: `npm run dev`

2. Ga naar: `http://localhost:3000/login`

3. Klik op "Verder met Google" of "Verder met Facebook"

4. Check de browser console (F12) voor logs

## Belangrijk: Twee Verschillende Redirect URLs

**VERWARRING**: Er zijn twee verschillende redirect URLs:

1. **In Supabase Dashboard** (Authentication → URL Configuration):
   - Dit is waar Supabase naartoe redirect na OAuth
   - Moet bevatten: `http://localhost:3000/auth/callback`

2. **In Google/Facebook Console**:
   - Dit is waar Google/Facebook naartoe redirect na authenticatie
   - Moet bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - Supabase handelt dit af en redirect dan naar jouw app

## Troubleshooting

Als het nog steeds niet werkt:

1. Check of de redirect URLs **exact** overeenkomen (inclusief trailing slashes)
2. Clear browser cache en cookies
3. Test in incognito mode
4. Check de server logs voor callback parameters
5. Gebruik de debug pagina: `http://localhost:3000/debug/oauth`

## Lokale Config Update

Ik heb de `supabase/config.toml` al geüpdatet met de juiste redirect URLs voor lokale ontwikkeling. Deze worden gebruikt wanneer je `supabase start` gebruikt voor lokale ontwikkeling.

