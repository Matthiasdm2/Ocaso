# Waar moet de Supabase Callback URL staan?

## De URL die je hebt:
```
https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback
```

## ✅ Waar deze URL MOET staan:

### 1. Google Cloud Console
**Locatie**: https://console.cloud.google.com/apis/credentials

**Stappen**:
1. Selecteer je OAuth 2.0 Client ID
2. Scroll naar **Authorized redirect URIs**
3. Klik op **+ ADD URI**
4. Plak: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
5. Klik **SAVE**

**Waarom**: Google moet weten waar het naartoe moet redirecten na authenticatie.

---

### 2. Facebook App Settings
**Locatie**: https://developers.facebook.com/apps → [Je App] → Facebook Login → Settings

**Stappen**:
1. Ga naar je Facebook App
2. Klik op **Facebook Login** in het menu links
3. Klik op **Settings**
4. Scroll naar **Valid OAuth Redirect URIs**
5. Klik op **+ Add URI**
6. Plak: `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`
7. Klik **Save Changes**

**Waarom**: Facebook moet weten waar het naartoe moet redirecten na authenticatie.

---

## ❌ Waar deze URL NIET moet staan:

### Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

**Hier moet je JOUW app URLs plaatsen, niet de Supabase callback URL:**

✅ **Goed** (jouw app URLs):
```
http://localhost:3000/auth/callback
https://ocaso.be/auth/callback
https://ocaso-rewrite.vercel.app/auth/callback
```

❌ **Fout** (Supabase callback URL):
```
https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback  ← NIET HIER!
```

---

## 📋 Complete Checklist

### Google OAuth Setup:
- [ ] Google Cloud Console → OAuth Client ID → Authorized redirect URIs
  - [ ] `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` staat erin
- [ ] Supabase Dashboard → Authentication → Providers → Google
  - [ ] Enabled is aan
  - [ ] Client ID is ingevuld
  - [ ] Client Secret is ingevuld

### Facebook OAuth Setup:
- [ ] Facebook Developers → App → Facebook Login → Settings → Valid OAuth Redirect URIs
  - [ ] `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` staat erin
- [ ] Supabase Dashboard → Authentication → Providers → Facebook
  - [ ] Enabled is aan
  - [ ] App ID is ingevuld
  - [ ] App Secret is ingevuld

### Supabase Dashboard → Authentication → URL Configuration:
- [ ] Site URL: `http://localhost:3000` (voor lokaal) of `https://ocaso.be` (voor productie)
- [ ] Redirect URLs bevatten:
  - [ ] `http://localhost:3000/auth/callback`
  - [ ] `https://ocaso.be/auth/callback`
  - [ ] `https://ocaso-rewrite.vercel.app/auth/callback`

---

## 🔄 De OAuth Flow

1. **Gebruiker klikt op "Verder met Google"**
   - Jouw app → Supabase authorize URL

2. **Supabase redirect naar Google**
   - Supabase → Google login pagina

3. **Gebruiker logt in bij Google**
   - Google → `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` (met code)

4. **Supabase wisselt code uit voor session**
   - Supabase verwerkt de callback

5. **Supabase redirect naar jouw app**
   - Supabase → `http://localhost:3000/auth/callback` (met code)

6. **Jouw app logt gebruiker in**
   - Jouw app verwerkt de callback en logt gebruiker in

---

## 🚨 Veelvoorkomende Fouten

### Fout 1: Supabase callback URL in Supabase Dashboard
**Symptoom**: OAuth werkt niet, blijft hangen op Supabase pagina
**Oplossing**: Verwijder `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` uit Supabase Dashboard Redirect URLs

### Fout 2: Jouw app callback URL in Google/Facebook
**Symptoom**: `redirect_uri_mismatch` error
**Oplossing**: Gebruik `https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback` in Google/Facebook, niet jouw eigen URL

### Fout 3: Trailing slash
**Symptoom**: Redirect werkt niet
**Oplossing**: Gebruik geen trailing slash (`/auth/callback` niet `/auth/callback/`)

---

## ✅ Testen

Na het configureren:

1. Ga naar: `http://localhost:3000/login`
2. Klik op "Verder met Google"
3. Klik op "Ga naar Google"
4. Je zou nu naar Google moeten gaan (niet blijven hangen op Supabase pagina)
5. Na inloggen bij Google kom je terug op `http://localhost:3000/auth/callback`
6. Je wordt automatisch doorgestuurd naar `/profile`

