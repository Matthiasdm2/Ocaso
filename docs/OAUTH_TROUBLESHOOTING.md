# OAuth Troubleshooting Guide

## Probleem: "OAuth authenticatie onvolledig. Probeer het opnieuw."

Deze foutmelding betekent dat de OAuth callback geen `code` parameter ontvangt. Dit gebeurt meestal wanneer de redirect URL niet correct is geconfigureerd.

## Stap 1: Controleer de Browser Console

1. Open de browser Developer Tools (F12)
2. Ga naar de Console tab
3. Klik op de Google/Facebook login knop
4. Kijk naar de logs die beginnen met "Starting OAuth flow for..."
5. Noteer de `redirectTo` URL die wordt gebruikt

## Stap 2: Controleer Supabase Dashboard

1. Ga naar je Supabase Dashboard: https://supabase.com/dashboard
2. Selecteer je project
3. Ga naar **Authentication** > **URL Configuration**
4. Controleer de **Site URL**:
   - Voor lokaal: `http://localhost:3000`
   - Voor productie: `https://ocaso.be`

5. Ga naar **Authentication** > **Providers**
6. Voor **Google**:
   - Controleer of Google is ingeschakeld
   - Controleer of Client ID en Secret zijn ingevuld
   - Klik op "Edit" en controleer de **Redirect URLs**
   - Deze moeten exact bevatten:
     - `http://localhost:3000/auth/callback` (voor lokaal)
     - `https://ocaso.be/auth/callback` (voor productie)

7. Voor **Facebook**:
   - Controleer of Facebook is ingeschakeld
   - Controleer of App ID en Secret zijn ingevuld
   - Controleer de **Redirect URLs** (zelfde als Google)

## Stap 3: Controleer Google Cloud Console (voor Google OAuth)

1. Ga naar https://console.cloud.google.com
2. Selecteer je project
3. Ga naar **APIs & Services** > **Credentials**
4. Klik op je OAuth 2.0 Client ID
5. Controleer **Authorized redirect URIs**:
   - Moet bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - **BELANGRIJK**: Dit is de Supabase callback URL, niet je eigen callback URL!

## Stap 4: Controleer Facebook App Settings (voor Facebook OAuth)

1. Ga naar https://developers.facebook.com/apps
2. Selecteer je app
3. Ga naar **Settings** > **Basic**
4. Controleer **App Domains**:
   - Moet bevatten: `ocaso.be` (voor productie)
   - Moet bevatten: `localhost` (voor lokaal testen)

5. Ga naar **Facebook Login** > **Settings**
6. Controleer **Valid OAuth Redirect URIs**:
   - Moet bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - **BELANGRIJK**: Dit is de Supabase callback URL, niet je eigen callback URL!

## Stap 5: Controleer Environment Variables

Zorg ervoor dat deze variabelen zijn ingesteld:

```bash
NEXT_PUBLIC_ENABLE_OAUTH=true
NEXT_PUBLIC_SITE_URL=https://ocaso.be  # of http://localhost:3000 voor lokaal
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## Belangrijk: Supabase Redirect URL vs App Redirect URL

**VERWARRING**: Er zijn twee verschillende redirect URLs:

1. **Supabase Redirect URL** (in Google/Facebook console):
   - Dit is: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - Deze moet worden toegevoegd in Google Cloud Console en Facebook App Settings
   - Supabase handelt de OAuth flow af en redirect dan naar jouw app

2. **App Redirect URL** (in Supabase dashboard):
   - Dit is: `https://ocaso.be/auth/callback` of `http://localhost:3000/auth/callback`
   - Deze moet worden toegevoegd in Supabase Dashboard > Authentication > URL Configuration
   - Dit is waar Supabase naartoe redirect na succesvolle OAuth

## Debugging: Check Server Logs

Wanneer je de OAuth flow probeert, check de server logs voor:
- "OAuth callback received:" - toont alle parameters die de callback ontvangt
- "OAuth callback missing code parameter" - betekent dat er geen code is ontvangen

## Veelvoorkomende Problemen

1. **Redirect URL mismatch**: De URL in Supabase komt niet overeen met wat je gebruikt
2. **Google/Facebook niet geconfigureerd**: Client ID/Secret ontbreekt of is incorrect
3. **Verkeerde Supabase redirect URL**: In Google/Facebook console staat de verkeerde Supabase URL
4. **Environment variables**: NEXT_PUBLIC_SITE_URL is niet correct ingesteld

## Test Stappen

1. Start de dev server: `npm run dev`
2. Open http://localhost:3000/login
3. Open browser console (F12)
4. Klik op "Verder met Google" of "Verder met Facebook"
5. Check de console logs voor de redirect URL
6. Check of je wordt doorgestuurd naar Google/Facebook
7. Na authenticatie, check of je terugkomt op `/auth/callback`
8. Check server logs voor callback parameters

## Als het nog steeds niet werkt

1. Check of de Supabase project URL correct is: `https://dmnowaqinfkhovhyztan.supabase.co`
2. Verifieer dat OAuth providers zijn ingeschakeld in Supabase Dashboard
3. Controleer of de redirect URLs exact overeenkomen (inclusief trailing slashes)
4. Test met een andere browser of incognito mode
5. Clear browser cache en cookies
6. Check Supabase logs in het dashboard voor errors

