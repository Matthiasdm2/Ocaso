# Google OAuth Verificatie Checklist

## ✅ Controleer deze punten in Google Cloud Console:

### 1. OAuth Consent Screen
**Locatie**: https://console.cloud.google.com/apis/credentials/consent

- [ ] **User Type**: External (of Internal als je Google Workspace hebt)
- [ ] **App name**: Ocaso (of een andere naam)
- [ ] **User support email**: Jouw email adres
- [ ] **Developer contact information**: Jouw email adres
- [ ] **Publishing status**: 
  - Voor testen: "Testing" is OK
  - Voor productie: Moet "In production" zijn

### 2. OAuth 2.0 Client ID
**Locatie**: https://console.cloud.google.com/apis/credentials

- [ ] **Application type**: Web application
- [ ] **Name**: Ocaso Web Client (of vergelijkbaar)
- [ ] **Authorized redirect URIs** bevat EXACT:
  ```
  https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
  ```
  ⚠️ **BELANGRIJK**: 
  - Geen trailing slash (`/auth/v1/callback` niet `/auth/v1/callback/`)
  - Exact deze URL, geen variaties
  - Geen andere URLs die kunnen conflicteren

### 3. Client ID en Secret
- [ ] Je hebt de **Client ID** gekopieerd
- [ ] Je hebt de **Client Secret** gekopieerd
- [ ] Deze zijn geplakt in Supabase Dashboard → Authentication → Providers → Google

---

## ✅ Controleer deze punten in Supabase Dashboard:

### Authentication → Providers → Google
**Locatie**: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers

- [ ] **Enabled**: Aan (toggle is groen/actief)
- [ ] **Client ID (for OAuth)**: Is ingevuld (niet leeg)
- [ ] **Client Secret (for OAuth)**: Is ingevuld (niet leeg)
- [ ] **SAVE** is geklikt na het invullen

### Authentication → URL Configuration
**Locatie**: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/url-configuration

- [ ] **Site URL**: 
  - Voor lokaal: `http://localhost:3000`
  - Voor productie: `https://ocaso.be`
  
- [ ] **Redirect URLs** bevatten:
  ```
  http://localhost:3000/auth/callback
  https://ocaso.be/auth/callback
  https://ocaso-rewrite.vercel.app/auth/callback
  ```
  ⚠️ **BELANGRIJK**: 
  - Geen trailing slash
  - Exact deze URLs
  - NIET de Supabase callback URL hier!

---

## 🧪 Test de Configuratie

1. **Start je lokale server**:
   ```bash
   npm run dev
   ```

2. **Ga naar**: `http://localhost:3000/login`

3. **Open browser console** (F12 → Console tab)

4. **Klik op "Verder met Google"**

5. **Kijk naar de console logs**:
   - Je zou moeten zien: `[OAuth] Starting flow for google:`
   - Noteer de `redirectTo` URL

6. **Klik op "Ga naar Google"**

7. **Verwacht gedrag**:
   - ✅ Je gaat naar Google login pagina (niet blijven hangen op Supabase pagina)
   - ✅ Na inloggen kom je terug op `http://localhost:3000/auth/callback`
   - ✅ Je wordt automatisch doorgestuurd naar `/profile`

---

## 🚨 Veelvoorkomende Problemen

### Probleem 1: Blijft hangen op Supabase authorize pagina
**Oorzaak**: Google OAuth niet geconfigureerd in Supabase
**Oplossing**: 
- Check of Client ID en Secret zijn ingevuld in Supabase Dashboard
- Check of "Enabled" aan staat

### Probleem 2: `redirect_uri_mismatch` error
**Oorzaak**: Verkeerde redirect URI in Google Cloud Console
**Oplossing**: 
- Check of `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` EXACT staat in Authorized redirect URIs
- Geen trailing slash, geen variaties

### Probleem 3: "OAuth authenticatie onvolledig" na Google login
**Oorzaak**: Redirect URL niet in Supabase Dashboard
**Oplossing**: 
- Check of `http://localhost:3000/auth/callback` staat in Supabase Dashboard → Redirect URLs
- Check of Site URL overeenkomt met waar je werkt (`http://localhost:3000` voor lokaal)

### Probleem 4: "access_denied" van Google
**Oorzaak**: Je hebt de toegang geannuleerd of OAuth consent screen is niet correct
**Oplossing**: 
- Probeer opnieuw en accepteer de toegang
- Check OAuth consent screen configuratie
- Als je in "Testing" mode bent, voeg jezelf toe als test user

---

## 📝 Wat te delen voor hulp

Als je hulp nodig hebt, deel deze informatie:

1. **Wat zie je in Google Cloud Console → Authorized redirect URIs?**
   - Lijst alle URLs die daar staan

2. **Wat zie je in Supabase Dashboard → Authentication → Providers → Google?**
   - Is Enabled aan?
   - Is Client ID ingevuld? (eerste/last paar karakters is genoeg)
   - Is Client Secret ingevuld?

3. **Wat zie je in Supabase Dashboard → Authentication → URL Configuration?**
   - Wat is de Site URL?
   - Welke Redirect URLs staan er?

4. **Wat gebeurt er wanneer je test?**
   - Blijf je hangen op Supabase pagina?
   - Krijg je een foutmelding? (welke?)
   - Ga je naar Google maar krijg je daar een fout?

