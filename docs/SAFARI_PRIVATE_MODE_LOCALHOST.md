# Safari Privé Modus en Localhost

## Probleem
Localhost werkt niet in Safari privé modus, maar wel in Google Chrome.

## Oorzaak
Safari privé modus heeft striktere beveiligingsinstellingen die localhost kunnen blokkeren of beperken, vooral voor:
- Cookies
- LocalStorage
- Service Workers
- WebSockets

## Oplossingen

### Optie 1: Gebruik Google Chrome (Aanbevolen)
- Chrome heeft betere ondersteuning voor localhost development
- Geen extra configuratie nodig
- Werkt perfect voor OAuth testing

### Optie 2: Gebruik Safari Normale Modus
- Safari normale modus (niet privé) werkt meestal wel met localhost
- Open Safari zonder privé modus
- Ga naar: `http://localhost:3000`

### Optie 3: Safari Privé Modus Instellingen
Als je Safari privé modus moet gebruiken:

1. **Safari → Voorkeuren → Privacy**
2. **Schakel "Voorkom cross-site tracking" uit** (tijdelijk voor development)
3. **Schakel "Blokkeer alle cookies" uit** (als dit aan staat)
4. Test opnieuw

**Let op**: Zet deze instellingen weer terug na development!

### Optie 4: Gebruik een Test Domain
Voor productie-achtige testing:

1. **Voeg toe aan `/etc/hosts`**:
   ```
   127.0.0.1 local.ocaso.be
   ```

2. **Start je dev server met**:
   ```bash
   npm run dev
   ```

3. **Ga naar**: `http://local.ocaso.be:3000`

4. **Update Supabase Dashboard**:
   - Site URL: `http://local.ocaso.be:3000`
   - Redirect URLs: `http://local.ocaso.be:3000/auth/callback`

## Waarom Chrome Werkt maar Safari Privé Niet

### Chrome Privé Modus
- Blokkeert tracking maar staat localhost toe
- Cookies en localStorage werken meestal wel
- Betere developer tools

### Safari Privé Modus
- Striktere privacy instellingen
- Kan localhost blokkeren
- Beperkte cookie/localStorage ondersteuning
- Minder geschikt voor development

## Aanbeveling voor OAuth Testing

Voor OAuth testing is **Google Chrome** (normaal of privé modus) de beste keuze omdat:
- ✅ Betere OAuth ondersteuning
- ✅ Betere developer tools
- ✅ Betere error messages
- ✅ Werkt perfect met localhost

## Test OAuth in Chrome

1. Open Google Chrome
2. Ga naar: `http://localhost:3000/debug/google-oauth`
3. Klik op "Test Google OAuth"
4. Klik op "Open OAuth URL"
5. Test de OAuth flow

## Als je Safari Moet Gebruiken

Als je Safari moet gebruiken voor testing:

1. **Gebruik Safari normale modus** (niet privé)
2. Of **configureer Safari instellingen** zoals hierboven beschreven
3. Of **gebruik een test domain** zoals `local.ocaso.be`

## Wit Scherm Probleem in Safari

Als je een **wit scherm** ziet in Safari bij `http://localhost:3000`, volg deze stappen:

### ⚠️ SSL/HTTPS Upgrade Probleem (Meest Voorkomend)

**Symptoom**: Errors zoals:
```
Failed to load resource: Er heeft zich een SSL-fout voorgedaan
```

**Oorzaak**: Safari probeert automatisch HTTP naar HTTPS te upgraden door:
- CSP header `upgrade-insecure-requests` (nu gefixed in development)
- HSTS (HTTP Strict Transport Security) cache voor localhost

**Oplossing**:

1. **Herstart de dev server** (na de fix):
   ```bash
   # Stop de server (Ctrl+C)
   npm run dev
   ```

2. **Wis Safari HSTS Cache**:
   - Sluit Safari volledig af
   - Open Terminal en voer uit:
     ```bash
     rm ~/Library/Cookies/HSTS.plist
     rm ~/Library/Caches/com.apple.Safari/HSTS.plist
     ```
   - Of gebruik deze methode:
     - Open Keychain Access
     - Zoek naar "localhost" of "ocaso"
     - Verwijder alle entries die localhost bevatten
     - Herstart Safari

3. **Test opnieuw**:
   - Open Safari
   - Ga naar: `http://localhost:3000` (zorg dat het **http** is, niet https)
   - Als Safari automatisch naar `https://localhost:3000` redirect, typ dan expliciet `http://localhost:3000`

4. **Als het nog steeds niet werkt**:
   - Gebruik een andere poort: `http://localhost:3001`
   - Of gebruik Chrome voor development (aanbevolen)

### Stap 1: Open Safari Developer Console

1. **Activeer Developer Menu** (als je dit nog niet hebt):
   - Safari → Instellingen → Geavanceerd
   - Vink "Menu 'Ontwikkelaar' weergeven in menubalk" aan

2. **Open Web Inspector**:
   - Ontwikkelaar → Web Inspector tonen (of druk `⌘⌥I`)
   - Ga naar het tabblad **Console**

3. **Check voor JavaScript Errors**:
   - Kijk naar rode error berichten
   - Noteer welke errors je ziet

### Stap 2: Check Network Tab

1. In Web Inspector, ga naar het tabblad **Netwerk**
2. Refresh de pagina (`⌘R`)
3. Kijk of alle JavaScript bestanden laden:
   - `/_next/static/chunks/main-app.js`
   - `/_next/static/chunks/app/layout.js`
   - `/_next/static/chunks/webpack.js`

4. Als bestanden **rood** zijn (failed), klik erop om de error te zien

### Stap 3: Veelvoorkomende Oorzaken

#### A. Content Security Policy (CSP) Blokkering
**Symptoom**: Console errors over "Content Security Policy" of "Refused to load"

**Oplossing**: 
- Check `next.config.mjs` voor CSP headers
- Safari kan strikter zijn dan Chrome met CSP

#### B. Mixed Content (HTTP/HTTPS)
**Symptoom**: Errors over "mixed content" of "insecure resources"

**Oplossing**:
- Zorg dat je `http://localhost:3000` gebruikt (niet `https://`)
- Check of Supabase URLs HTTPS zijn

#### C. JavaScript Syntax Errors
**Symptoom**: Syntax errors in console

**Oplossing**:
- Check terminal waar `npm run dev` draait voor build errors
- Herstart de dev server: stop (`Ctrl+C`) en start opnieuw (`npm run dev`)

#### D. CORS Issues
**Symptoom**: CORS errors in console

**Oplossing**:
- Check of Supabase URLs correct zijn
- Check middleware configuratie

### Stap 4: Quick Fixes

1. **Clear Safari Cache**:
   - Ontwikkelaar → Caches legen
   - Of: Safari → Wis geschiedenis → Alle geschiedenis

2. **Disable Extensions**:
   - Safari → Instellingen → Uitbreidingen
   - Schakel alle uitbreidingen tijdelijk uit

3. **Try Incognito Window**:
   - Bestand → Nieuw privévenster
   - Test opnieuw (maar zie bovenstaande beperkingen)

4. **Check Terminal Logs**:
   - Kijk naar de terminal waar `npm run dev` draait
   - Zoek naar errors of warnings

### Stap 5: Debugging Commands

Test of de server werkt:
```bash
curl http://localhost:3000
```

Check of poort 3000 in gebruik is:
```bash
lsof -i :3000
```

Check environment variables:
```bash
# In de terminal waar npm run dev draait, check of deze variabelen bestaan:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Stap 6: Als Niets Helpt

1. **Gebruik Chrome** voor development (aanbevolen)
2. **Check of het in Chrome werkt** - als het daar wel werkt, is het een Safari-specifiek probleem
3. **Herstart de dev server**:
   ```bash
   # Stop de server (Ctrl+C)
   # Start opnieuw
   npm run dev
   ```

## Conclusie

Voor development en OAuth testing is **Google Chrome** de beste keuze. Safari privé modus heeft te veel beperkingen voor localhost development.

Als je een wit scherm ziet, gebruik de **Developer Console** om te zien wat er misgaat. Meestal zijn het JavaScript errors die je daar kunt zien.

