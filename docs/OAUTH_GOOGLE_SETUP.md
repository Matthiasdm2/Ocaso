# Google OAuth Setup - Stap voor Stap

## Probleem
Je komt op de Supabase authorize pagina terecht (`https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/authorize?provider=google&...`) maar wordt niet doorgestuurd naar Google.

## Oorzaak
Google OAuth is niet geconfigureerd in Supabase Dashboard.

## Oplossing

### Stap 1: Maak Google OAuth Credentials aan

1. **Ga naar Google Cloud Console**: https://console.cloud.google.com/apis/credentials

2. **Selecteer of maak een project aan**:
   - Als je al een project hebt, selecteer die
   - Anders klik op "CREATE PROJECT" en geef het een naam (bijv. "Ocaso")

3. **Configureer OAuth Consent Screen** (als je dit nog niet hebt gedaan):
   - Klik op "OAuth consent screen" in het menu links
   - Kies **External** (tenzij je een Google Workspace account hebt)
   - Vul de vereiste velden in:
     - **App name**: Ocaso
     - **User support email**: jouw email adres
     - **Developer contact information**: jouw email adres
   - Klik **SAVE AND CONTINUE**
   - **Scopes**: Skip deze stap (niet nodig voor basis OAuth)
   - Klik **SAVE AND CONTINUE**
   - **Test users**: Voeg jezelf toe als test user (optioneel, maar aanbevolen)
   - Klik **SAVE AND CONTINUE**
   - Klik **BACK TO DASHBOARD**

4. **Maak OAuth Client ID aan**:
   - Ga terug naar **Credentials**
   - Klik op **+ CREATE CREDENTIALS** → **OAuth client ID**
   - **Application type**: Kies **Web application**
   - **Name**: Ocaso Web Client
   - **Authorized redirect URIs**: Klik op **+ ADD URI** en voeg toe:
     ```
     https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
     ```
     **BELANGRIJK**: Dit is de Supabase callback URL, niet je eigen callback URL!
   - Klik **CREATE**

5. **Kopieer de credentials**:
   - Je ziet nu een popup met:
     - **Your Client ID**: Kopieer dit
     - **Your Client Secret**: Kopieer dit
   - **BELANGRIJK**: Bewaar deze veilig, je kunt het Client Secret later niet meer zien!

### Stap 2: Configureer in Supabase Dashboard

1. **Ga naar Supabase Dashboard**: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers

2. **Klik op "Google"** in de lijst van providers

3. **Vul de credentials in**:
   - **Enabled**: Zet dit aan (toggle)
   - **Client ID (for OAuth)**: Plak de Client ID van Google
   - **Client Secret (for OAuth)**: Plak de Client Secret van Google

4. **Klik op "SAVE"** onderaan de pagina

### Stap 3: Controleer Redirect URLs in Supabase

1. **Ga naar**: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/url-configuration

2. **Site URL**: 
   - Voor lokaal testen: `http://localhost:3000`
   - Voor productie: `https://ocaso.be`

3. **Redirect URLs**: Zorg dat deze URL's aanwezig zijn:
   ```
   http://localhost:3000/auth/callback
   https://ocaso.be/auth/callback
   https://ocaso-rewrite.vercel.app/auth/callback
   ```

### Stap 4: Test opnieuw

1. Ga naar: `http://localhost:3000/login`
2. Klik op "Verder met Google"
3. Klik op "Ga naar Google"
4. Je zou nu naar Google moeten gaan voor authenticatie!

## Troubleshooting

### Als je nog steeds op de Supabase pagina blijft hangen:

1. **Check of Google OAuth is enabled**:
   - Ga naar Supabase Dashboard → Authentication → Providers → Google
   - Zorg dat "Enabled" aan staat

2. **Check of Client ID en Secret correct zijn**:
   - Zorg dat er geen extra spaties zijn
   - Kopieer opnieuw vanuit Google Cloud Console

3. **Wacht een paar minuten**:
   - Google credentials kunnen even duren om actief te worden
   - Probeer na 2-3 minuten opnieuw

4. **Test in incognito mode**:
   - Soms kan browser cache problemen veroorzaken
   - Open een incognito venster en test opnieuw

5. **Check de browser console**:
   - Open Developer Tools (F12)
   - Ga naar Console tab
   - Kijk naar eventuele foutmeldingen

### Als je een foutmelding krijgt van Google:

- **"redirect_uri_mismatch"**: 
  - Controleer of `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` exact staat in Google Cloud Console → Authorized redirect URIs
  - Zorg dat er geen trailing slash is

- **"access_denied"**:
  - Je hebt de Google authenticatie geannuleerd
  - Probeer opnieuw en accepteer de toegang

## Belangrijk: Twee Verschillende Redirect URLs

**VERWARRING**: Er zijn twee verschillende redirect URLs:

1. **In Google Cloud Console** (Authorized redirect URIs):
   ```
   https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
   ```
   Dit is waar Google naartoe redirect na authenticatie.

2. **In Supabase Dashboard** (Redirect URLs):
   ```
   http://localhost:3000/auth/callback
   ```
   Dit is waar Supabase naartoe redirect na het uitwisselen van de code.

De flow is:
1. Gebruiker klikt op "Ga naar Google"
2. Redirect naar Supabase authorize URL
3. Supabase redirect naar Google
4. Gebruiker authenticatie bij Google
5. Google redirect naar Supabase callback (`https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`)
6. Supabase wisselt code uit voor session
7. Supabase redirect naar jouw app callback (`http://localhost:3000/auth/callback`)
8. Jouw app logt de gebruiker in

