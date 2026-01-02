#!/bin/bash
# Check Supabase Cloud Configuration WITHOUT Docker
# Dit script werkt zonder Docker en checkt alleen cloud configuratie
#
# Gebruik: ./scripts/check-supabase-cloud-no-docker.sh

set -e

echo "🔍 Supabase Cloud Configuration Check (Zonder Docker)"
echo "============================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI niet geïnstalleerd"
  echo "   Installeer via: npm install -g supabase"
  exit 1
fi

# Check project link (this doesn't need Docker)
echo "📦 Project Status:"
if supabase projects list &> /dev/null 2>&1; then
  echo "✅ Supabase CLI is gelinkt aan een project"
  
  # Get project info
  echo ""
  echo "Project informatie:"
  supabase projects list 2>/dev/null | head -10 || echo "   Kon project info niet ophalen"
else
  echo "⚠️  Geen project gelinkt"
  echo ""
  echo "   Om project te linken ZONDER Docker:"
  echo "   1. Ga naar https://supabase.com/dashboard"
  echo "   2. Selecteer je project"
  echo "   3. Ga naar Settings → General"
  echo "   4. Kopieer de Project Reference ID"
  echo "   5. Run: supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "   Of gebruik de API key methode:"
  echo "   supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD"
fi

echo ""
echo "============================================================"
echo "📊 Cloud Database Status:"
echo ""
echo "⚠️  Om migraties te checken zonder Docker, gebruik Supabase Dashboard:"
echo ""
echo "   1. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/database/migrations"
echo "   2. Controleer of alle migraties zijn toegepast"
echo ""
echo "   Belangrijke migraties om te checken:"
echo "   ✅ 20250106000000_add_bio_column.sql"
echo "   ✅ 20250106010000_fix_listings_public_access.sql"
echo ""

echo "============================================================"
echo "🔒 RLS Policies Check:"
echo ""
echo "Run dit SQL script in Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new"
echo ""
echo "Of gebruik het bestand: scripts/check-supabase-rls.sql"
echo ""

echo "Kritieke policies die moeten bestaan:"
echo "  ✅ profiles.profiles_select_public (SELECT TO public)"
echo "  ✅ listings.listings_select_policy (SELECT voor actieve listings)"
echo "  ✅ categories.categories_select_public (SELECT TO public)"
echo "  ✅ subcategories.subcategories_select_public (SELECT TO public)"
echo ""

echo "============================================================"
echo "🔐 Authentication Configuration:"
echo ""
echo "⚠️  Controleer handmatig in Supabase Dashboard:"
echo ""
echo "1. URL Configuration:"
echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/url-configuration"
echo ""
echo "   Controleer:"
echo "   ✅ Site URL: https://ocaso-rewrite.vercel.app"
echo "   ✅ Redirect URLs bevatten:"
echo "      - https://ocaso-rewrite.vercel.app/auth/callback"
echo "      - http://localhost:3000/auth/callback"
echo ""
echo "2. OAuth Providers:"
echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/providers"
echo ""
echo "   Controleer:"
echo "   ✅ Google: Enabled, Client ID en Secret ingevuld"
echo "   ✅ Facebook: Enabled, App ID en Secret ingevuld"
echo ""

echo "============================================================"
echo "🌐 External OAuth Configuration:"
echo ""
echo "Google Cloud Console:"
echo "  URL: https://console.cloud.google.com/apis/credentials"
echo "  ✅ Authorized redirect URIs moet bevatten:"
echo "     https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
echo ""
echo "Facebook Developers:"
echo "  URL: https://developers.facebook.com/apps"
echo "  ✅ Valid OAuth Redirect URIs moet bevatten:"
echo "     https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
echo ""

echo "============================================================"
echo "📋 Quick Checklist:"
echo ""
echo "Database:"
echo "  [ ] Alle migraties zijn toegepast (check Dashboard)"
echo "  [ ] RLS policies zijn correct (run check-supabase-rls.sql)"
echo "  [ ] Kritieke kolommen bestaan (bio, business_plan)"
echo ""
echo "Authentication:"
echo "  [ ] Site URL is correct ingesteld"
echo "  [ ] Redirect URLs zijn correct ingesteld"
echo "  [ ] Google OAuth is geconfigureerd"
echo "  [ ] Facebook OAuth is geconfigureerd"
echo ""
echo "External OAuth:"
echo "  [ ] Google Cloud Console redirect URI is ingesteld"
echo "  [ ] Facebook Developers redirect URI is ingesteld"
echo ""

echo "============================================================"
echo ""
echo "💡 Tip: Voor volledige cloud configuratie check:"
echo "   1. Open Supabase Dashboard"
echo "   2. Run SQL script: scripts/check-supabase-rls.sql"
echo "   3. Controleer Authentication configuratie handmatig"
echo ""

