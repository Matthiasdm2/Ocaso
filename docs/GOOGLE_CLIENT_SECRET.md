# Google Client Secret Vinden

## Waar vind je het Google Client Secret?

### Stap 1: Ga naar Google Cloud Console
1. Ga naar: https://console.cloud.google.com/apis/credentials
2. Zorg dat je het juiste project hebt geselecteerd

### Stap 2: Selecteer de Web Application Client ID
1. Klik op de **Web application** Client ID (971895670157-5cae...)
   - **NIET** de Desktop Client ID!

### Stap 3: Bekijk het Client Secret
1. Scroll naar beneden naar **Client secret**
2. Je ziet een veld met het Client Secret
3. Als je alleen `••••••••` ziet (verborgen):
   - Klik op het **oog icoon** (👁️) om het te tonen
   - Of klik op **RESET SECRET** om een nieuw secret aan te maken

## Als je het Client Secret niet meer ziet

### Optie 1: Reset het Secret (aanbevolen)
1. In de Client ID pagina, scroll naar **Client secret**
2. Klik op **RESET SECRET** of **Reset secret**
3. Google genereert een nieuw Client Secret
4. **BELANGRIJK**: Kopieer het nieuwe secret direct (je ziet het maar één keer!)
5. Update Supabase Dashboard met het nieuwe secret

### Optie 2: Maak een nieuwe Client ID aan
Als reset niet werkt:
1. Klik op **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **Web application**
3. Name: Ocaso Web Client (of een andere naam)
4. Authorized redirect URIs: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
5. Klik **CREATE**
6. Je krijgt een popup met:
   - **Your Client ID**: Kopieer dit
   - **Your Client Secret**: Kopieer dit (je ziet dit maar één keer!)
7. Update Supabase Dashboard met beide nieuwe waarden

## Belangrijk: Client Secret Beveiliging

⚠️ **WAARSCHUWING**: 
- Het Client Secret is gevoelige informatie
- Deel het nooit publiekelijk
- Bewaar het veilig
- Als je het per ongeluk hebt gedeeld, reset het direct

## Stap-voor-stap: Client Secret naar Supabase

1. **Kopieer het Client Secret** vanuit Google Cloud Console
2. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers
3. Klik op "Google"
4. Plak het Client Secret in het veld **Client Secret (for OAuth)**
5. Zorg dat er geen spaties voor of na staan
6. Klik **SAVE**

## Verificatie

Na het invullen:
1. Controleer dat het Client Secret veld is ingevuld (niet leeg)
2. Controleer dat er geen spaties zijn
3. Klik **SAVE**
4. Wacht 30 seconden
5. Test opnieuw: `http://localhost:3000/test-oauth`

## Troubleshooting

### "Client Secret is incorrect"
- Kopieer het secret opnieuw vanuit Google Cloud Console
- Zorg dat je de **Web application** Client ID gebruikt (niet Desktop)
- Controleer op spaties voor/na het secret
- Reset het secret en gebruik het nieuwe secret

### "Cannot see Client Secret"
- Klik op het oog icoon om het te tonen
- Als dat niet werkt, reset het secret
- Of maak een nieuwe Client ID aan

