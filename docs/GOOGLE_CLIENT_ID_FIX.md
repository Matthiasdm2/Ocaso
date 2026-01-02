# Google OAuth: Meerdere Client IDs - Fix

## Probleem
Je hebt twee OAuth 2.0 Client IDs in Google Cloud Console:
1. **Ocaso web** - Web application (971895670157-5cae...)
2. **Ocaso web** - Desktop (971895670157-apb9...)

Voor OAuth met Supabase moet je de **Web application** Client ID gebruiken, niet de Desktop Client ID.

## Oplossing

### Stap 1: Identificeer de juiste Client ID

1. Ga naar: https://console.cloud.google.com/apis/credentials
2. Klik op de **Web application** Client ID (971895670157-5cae...)
3. **NIET** de Desktop Client ID gebruiken!

### Stap 2: Configureer Redirect URI voor Web Application

In de **Web application** Client ID:

1. Scroll naar **Authorized redirect URIs**
2. Controleer of deze URL erin staat:
   ```
   https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
   ```
3. Als deze niet bestaat:
   - Klik op **+ ADD URI**
   - Plak: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - Klik **SAVE**

### Stap 3: Kopieer Client ID en Secret

Van de **Web application** Client ID:

1. Kopieer de **Client ID** (971895670157-5cae...)
2. Kopieer de **Client Secret** (als je deze niet ziet, klik op het oog icoon)
3. **BELANGRIJK**: Gebruik alleen de Web application credentials, niet de Desktop credentials!

### Stap 4: Update Supabase Dashboard

1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers
2. Klik op "Google"
3. Vul in:
   - **Client ID (for OAuth)**: Plak de Web application Client ID (971895670157-5cae...)
   - **Client Secret (for OAuth)**: Plak de Web application Client Secret
4. Zorg dat **Enabled** aan staat
5. Klik **SAVE**

### Stap 5: Verifieer

1. Controleer dat je de **Web application** Client ID gebruikt (niet Desktop)
2. Controleer dat de redirect URI correct is geconfigureerd
3. Controleer dat de credentials correct zijn geplakt in Supabase (geen spaties)

## Verificatie Checklist

- [ ] Web application Client ID geselecteerd (niet Desktop)
- [ ] Redirect URI `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` staat in Web application Client ID
- [ ] Web application Client ID gekopieerd naar Supabase Dashboard
- [ ] Web application Client Secret gekopieerd naar Supabase Dashboard
- [ ] Geen spaties voor/na de credentials
- [ ] SAVE geklikt in Supabase Dashboard
- [ ] Enabled toggle is AAN in Supabase Dashboard

## Waarom dit belangrijk is

- **Web application** Client ID: Voor web apps die OAuth gebruiken (zoals Supabase)
- **Desktop** Client ID: Voor desktop applicaties (niet geschikt voor Supabase OAuth)

Als je de Desktop Client ID gebruikt, werkt OAuth niet omdat deze niet de juiste redirect URIs ondersteunt voor web applicaties.

## Test

Na het configureren:

1. Ga naar: `http://localhost:3000/test-oauth`
2. Klik op "Test Google"
3. Klik op "Open Google OAuth URL"
4. Je zou nu naar Google moeten gaan (niet blijven hangen op Supabase pagina)

