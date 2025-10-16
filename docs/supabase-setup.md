# Supabase setup (production)

Follow these steps once. Afterwards, every deploy is operational.

## 1) Environment variables
Create `.env.local` from `.env.example` and fill:

- NEXT_PUBLIC_SITE_URL=https://www.ocaso.be
- NEXT_PUBLIC_SUPABASE_URL=Your Supabase Project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY=Anon key
- SUPABASE_SERVICE_ROLE_KEY=Service role (keep secret, server-only)

## 2) Auth URL settings
Supabase → Authentication → URL Configuration:
- Site URL: https://www.ocaso.be
- Redirect URLs: add https://www.ocaso.be/auth/confirm (and any others used post-login)

## 3) Custom SMTP (info@ocaso.be)
Authentication → Email → SMTP Settings:
- Sender email: info@ocaso.be
- Sender name: Ocaso
- Host: smtp.ocaso.be (of je provider-host)
- Port: 587 (STARTTLS) of 465 (SSL)
- Username: info@ocaso.be
- Password: SMTP-wachtwoord
- Minimum interval: 1–2s

DNS (bij je domeinprovider):
- SPF TXT: `v=spf1 include:send.yourprovider.com ~all` (pas include aan)
- DKIM: records zoals door provider geleverd
- DMARC TXT op _dmarc.ocaso.be: `v=DMARC1; p=quarantine; rua=mailto:dmarc@ocaso.be; pct=100`

## 4) Auth templates
Authentication → Templates:
- Confirm signup: upload de HTML uit `emails/verification.html`
  - Supabase variabelen: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`

## 5) Security settings
- Auth → Providers: alleen gebruikte providers aan.
- Auth → Rate limits: instellen conform SMTP capaciteit.
- Database Policies (RLS): al geconfigureerd in repo; migraties uitvoeren indien nodig.

## 6) Test
1. Registreer met extern adres (bijv. Gmail)
2. Controleer of mail in Inbox komt, knop werkt, redirect klopt
3. Check Supabase Auth logs bij issues

## Notes
- Verander SMTP/branding één keer; commits hier zijn reeds aanwezig (CSP/headers/metatags/robots/sitemap).
- Neem contact op als je me toegang wil geven om bovenstaande direct in Supabase te configureren.