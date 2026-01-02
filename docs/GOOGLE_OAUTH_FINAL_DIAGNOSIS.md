# Google OAuth Final Diagnosis

## Status: URL Generatie Werkt ✅

De OAuth URL wordt correct gegenereerd:
```
https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback
```

Dit betekent:
- ✅ Supabase client werkt correct
- ✅ Environment variables zijn correct
- ✅ Redirect URL is correct geconfigureerd

## Probleem: Blijft Hangen op Supabase Pagina

Als je naar de OAuth URL gaat maar blijft hangen op de Supabase authorize pagina (in plaats van naar Google te gaan), betekent dit dat:

**Google OAuth is niet correct geconfigureerd in Supabase Dashboard**

## Exacte Oplossing

### Stap 1: Open de OAuth URL
1. Klik op "Open OAuth URL" in de debug tool
2. Of ga direct naar: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback`

### Stap 2: Wat gebeurt er?
- **Als je naar Google gaat**: ✅ Alles werkt!
- **Als je blijft hangen op Supabase pagina**: ❌ Google OAuth niet geconfigureerd

### Stap 3: Als je blijft hangen - Fix Supabase Configuratie

1. **Ga naar Supabase Dashboard**:
   - https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers
   - Klik op "Google"

2. **Controleer EXACT deze punten**:
   - ✅ **Enabled**: Toggle moet AAN staan (groen, niet grijs)
   - ✅ **Client ID (for OAuth)**: Moet exact zijn: `971895670157-5caegagijr6v5qplisbbiauou0ffdpan.apps.googleusercontent.com`
   - ✅ **Client Secret (for OAuth)**: Moet ingevuld zijn (het nieuwe secret dat je hebt aangemaakt)
   - ✅ **Geen spaties**: Zorg dat er geen spaties voor of na de credentials zijn

3. **Klik op SAVE** (ook als alles al ingevuld is)

4. **Wacht 2 minuten** (configuratie kan even duren om door te werken)

5. **Test opnieuw**:
   - Ga naar: `http://localhost:3000/debug/google-oauth`
   - Klik op "Test Google OAuth"
   - Klik op "Open OAuth URL"
   - Je zou nu naar Google moeten gaan

## Als het nog steeds niet werkt

### Check 1: Google Cloud Console
1. Ga naar: https://console.cloud.google.com/apis/credentials
2. Klik op je **Web application** Client ID
3. Controleer **Authorized redirect URIs**:
   - Moet exact bevatten: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
   - Geen trailing slash
   - Geen variaties

### Check 2: Google OAuth Consent Screen
1. Ga naar: https://console.cloud.google.com/apis/credentials/consent
2. Controleer **Publishing status**:
   - Als "Testing": Voeg jezelf toe als test user
   - Als "In production": Alles OK

### Check 3: Supabase Site URL
1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/url-configuration
2. Controleer **Site URL**:
   - Voor lokaal testen: Moet zijn `http://localhost:3000`
   - **BELANGRIJK**: Als dit `https://ocaso.be` is, kan dit problemen veroorzaken!

### Check 4: Supabase Redirect URLs
1. In dezelfde pagina, controleer **Redirect URLs**:
   - Moet bevatten: `http://localhost:3000/auth/callback`
   - Geen trailing slash

## Debugging Tips

### Test in incognito mode
- Browser cache kan problemen veroorzaken
- Open een incognito venster
- Test opnieuw

### Check browser console
1. Open Developer Tools (F12)
2. Ga naar Console tab
3. Open de OAuth URL
4. Kijk naar eventuele errors

### Check network tab
1. Open Developer Tools (F12)
2. Ga naar Network tab
3. Open de OAuth URL
4. Kijk naar de requests:
   - Naar Supabase authorize: OK
   - Naar Google: Moet er zijn
   - Als er geen request naar Google is: Google OAuth niet geconfigureerd

## Verificatie Checklist

- [ ] Supabase Dashboard → Google → Enabled: AAN (groen)
- [ ] Supabase Dashboard → Google → Client ID: Ingevuld (exact zoals in Google Cloud Console)
- [ ] Supabase Dashboard → Google → Client Secret: Ingevuld (nieuwe secret)
- [ ] Supabase Dashboard → Google → SAVE geklikt
- [ ] 2 minuten gewacht na opslaan
- [ ] Google Cloud Console → Redirect URI correct
- [ ] Google Cloud Console → OAuth Consent Screen gepubliceerd of Testing mode
- [ ] Supabase Dashboard → Site URL: `http://localhost:3000` (voor lokaal)
- [ ] Supabase Dashboard → Redirect URLs: `http://localhost:3000/auth/callback`
- [ ] Getest in incognito mode

## Volgende Stap

Klik op "Open OAuth URL" in de debug tool en vertel me wat er gebeurt:
- Ga je naar Google? → ✅ Werkt!
- Blijf je op Supabase pagina? → ❌ Google OAuth niet geconfigureerd

