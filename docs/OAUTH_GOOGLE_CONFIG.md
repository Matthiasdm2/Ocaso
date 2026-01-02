# Google OAuth Configuratie Probleem

## Probleem
Je komt op de Supabase authorize pagina terecht maar wordt niet doorgestuurd naar Google.

## Oorzaak
Google OAuth is niet correct geconfigureerd in Supabase Dashboard.

## Oplossing

### Stap 1: Controleer Supabase Dashboard

1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers

2. Klik op **Google**

3. Controleer:
   - ✅ **Enabled** moet aan staan
   - ✅ **Client ID (for OAuth)** moet zijn ingevuld
   - ✅ **Client Secret (for OAuth)** moet zijn ingevuld

4. Als deze leeg zijn:
   - Je moet een Google OAuth Client ID en Secret aanmaken
   - Zie Stap 2 hieronder

### Stap 2: Maak Google OAuth Credentials aan

1. Ga naar: https://console.cloud.google.com/apis/credentials

2. Klik op **+ CREATE CREDENTIALS** → **OAuth client ID**

3. Als je nog geen OAuth consent screen hebt:
   - Klik eerst op **CONFIGURE CONSENT SCREEN**
   - Kies **External** (tenzij je een Google Workspace account hebt)
   - Vul de vereiste velden in:
     - App name: Ocaso
     - User support email: jouw email
     - Developer contact: jouw email
   - Klik **SAVE AND CONTINUE**
   - Skip de scopes (niet nodig voor basis OAuth)
   - Klik **SAVE AND CONTINUE**
   - Voeg test users toe (optioneel)
   - Klik **BACK TO DASHBOARD**

4. Maak OAuth Client ID aan:
   - Application type: **Web application**
   - Name: Ocaso Web Client
   - **Authorized redirect URIs**: Voeg toe:
     ```
     https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
     ```
   - Klik **CREATE**

5. Kopieer de **Client ID** en **Client Secret**

### Stap 3: Configureer in Supabase

1. Ga terug naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers

2. Klik op **Google**

3. Vul in:
   - **Client ID (for OAuth)**: Plak de Client ID van Google
   - **Client Secret (for OAuth)**: Plak de Client Secret van Google

4. Klik **SAVE**

### Stap 4: Test opnieuw

1. Ga naar: `http://localhost:3000/login`
2. Klik op "Verder met Google"
3. Klik op "Ga naar Google"
4. Je zou nu naar Google moeten gaan voor authenticatie

## Belangrijk

- De **Authorized redirect URIs** in Google Cloud Console moet zijn: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
- Dit is NIET je eigen callback URL, maar de Supabase callback URL
- Supabase handelt de OAuth flow af en redirect dan naar jouw app

## Als het nog steeds niet werkt

1. Check of Google OAuth is enabled in Supabase Dashboard
2. Check of Client ID en Secret correct zijn gekopieerd (geen extra spaties)
3. Wacht een paar minuten - Google credentials kunnen even duren om actief te worden
4. Test in incognito mode om cache problemen uit te sluiten

