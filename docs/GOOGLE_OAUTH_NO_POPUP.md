# Google OAuth: Geen Popup Verschijnt

## Probleem
Facebook OAuth werkt (popup verschijnt), maar Google OAuth niet. Dit wijst op een Google-specifieke configuratie probleem.

## Diagnose

### Test de configuratie:
1. Ga naar: `http://localhost:3000/test-oauth`
2. Klik op "Compare Both"
3. Dit vergelijkt Google en Facebook configuratie

## Mogelijke Oorzaken

### 1. Google OAuth niet enabled in Supabase
**Symptoom**: Geen popup, blijft op Supabase pagina
**Oplossing**:
- Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers
- Klik op "Google"
- Zorg dat **Enabled** toggle AAN staat (groen)
- Klik op **SAVE**

### 2. Google Client ID/Secret incorrect
**Symptoom**: Error bij OAuth call, of geen popup
**Oplossing**:
- Controleer in Supabase Dashboard → Authentication → Providers → Google:
  - Client ID moet exact zijn zoals in Google Cloud Console
  - Client Secret moet exact zijn zoals in Google Cloud Console
  - Geen extra spaties voor of na
  - Kopieer opnieuw vanuit Google Cloud Console
- Klik op **SAVE**

### 3. Google Cloud Console redirect URI incorrect
**Symptoom**: `redirect_uri_mismatch` error
**Oplossing**:
- Ga naar: https://console.cloud.google.com/apis/credentials
- Selecteer je OAuth 2.0 Client ID
- Check **Authorized redirect URIs**:
  - Moet exact bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
  - Geen trailing slash
  - Geen variaties
- Klik **SAVE**

### 4. Google OAuth Consent Screen niet gepubliceerd
**Symptoom**: Popup verschijnt maar toont error
**Oplossing**:
- Ga naar: https://console.cloud.google.com/apis/credentials/consent
- Check **Publishing status**:
  - **Testing**: OK voor lokaal testen, maar voeg jezelf toe als test user
  - **In production**: Vereist voor productie
- Als Testing: Voeg jezelf toe als test user onder "Test users"

### 5. Google OAuth scopes niet geconfigureerd
**Symptoom**: Popup verschijnt maar authenticatie faalt
**Oplossing**:
- Ga naar: https://console.cloud.google.com/apis/credentials/consent
- Check **Scopes**:
  - Voor basis OAuth: `openid`, `email`, `profile` zijn meestal voldoende
  - Deze worden automatisch toegevoegd door Supabase

## Stap-voor-stap Fix

### Stap 1: Verifieer Supabase Configuratie
1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers
2. Klik op "Google"
3. Controleer:
   - ✅ **Enabled**: Aan (groen)
   - ✅ **Client ID (for OAuth)**: Ingevuld (kopieer opnieuw als twijfel)
   - ✅ **Client Secret (for OAuth)**: Ingevuld (kopieer opnieuw als twijfel)
4. Klik **SAVE**
5. Wacht 30 seconden (configuratie kan even duren om door te werken)

### Stap 2: Verifieer Google Cloud Console
1. Ga naar: https://console.cloud.google.com/apis/credentials
2. Selecteer je OAuth 2.0 Client ID
3. Controleer **Authorized redirect URIs**:
   - Moet exact bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - Geen andere URLs die kunnen conflicteren
4. Klik **SAVE**

### Stap 3: Verifieer OAuth Consent Screen
1. Ga naar: https://console.cloud.google.com/apis/credentials/consent
2. Controleer **Publishing status**:
   - Als "Testing": Voeg jezelf toe als test user
   - Als "In production": Alles OK
3. Controleer **App information**:
   - App name is ingevuld
   - User support email is ingevuld
   - Developer contact is ingevuld

### Stap 4: Test opnieuw
1. Ga naar: `http://localhost:3000/test-oauth`
2. Klik op "Test Google"
3. Klik op "Open Google OAuth URL"
4. Je zou nu naar Google moeten gaan

## Debugging Tips

### Check browser console (F12):
- Kijk naar errors die beginnen met `[OAuth]`
- Noteer eventuele error messages

### Check server logs:
- Kijk naar terminal waar `npm run dev` draait
- Zoek naar `[OAuth Callback]` logs

### Test met incognito mode:
- Soms kan browser cache problemen veroorzaken
- Test in incognito venster

## Als het nog steeds niet werkt

1. **Verwijder en voeg opnieuw toe**:
   - In Supabase Dashboard: Disable Google, save, enable Google, save
   - In Google Cloud Console: Verwijder redirect URI, save, voeg opnieuw toe, save

2. **Wacht een paar minuten**:
   - Configuratie wijzigingen kunnen even duren om door te werken

3. **Check of je de juiste Google project gebruikt**:
   - Zorg dat je dezelfde Client ID gebruikt in beide plaatsen

4. **Test met een andere browser**:
   - Soms kunnen browser extensies problemen veroorzaken

## Verificatie Checklist

- [ ] Google OAuth enabled in Supabase Dashboard
- [ ] Client ID correct gekopieerd (geen spaties)
- [ ] Client Secret correct gekopieerd (geen spaties)
- [ ] SAVE geklikt in Supabase Dashboard
- [ ] Redirect URI correct in Google Cloud Console
- [ ] OAuth Consent Screen gepubliceerd of in Testing mode
- [ ] Test user toegevoegd (als Testing mode)
- [ ] 30 seconden gewacht na configuratie wijzigingen
- [ ] Getest in incognito mode
- [ ] Browser console gecheckt voor errors

