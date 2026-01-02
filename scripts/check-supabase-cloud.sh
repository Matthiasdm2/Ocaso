#!/bin/bash
# Check Supabase Cloud Configuration
# Controleert de Supabase cloud configuratie via CLI en API
#
# Gebruik: ./scripts/check-supabase-cloud.sh

set -e

echo "🔍 Supabase Cloud Configuration Check"
echo "============================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI niet geïnstalleerd"
  echo "   Installeer via: npm install -g supabase"
  exit 1
fi

# Check if linked to project
echo "📦 Project Status:"
if supabase projects list &> /dev/null; then
  echo "✅ Supabase CLI is gelinkt aan een project"
  
  # Try to get project info
  PROJECT_INFO=$(supabase projects list 2>/dev/null || echo "")
  if [ -n "$PROJECT_INFO" ]; then
    echo ""
    echo "Project informatie:"
    echo "$PROJECT_INFO" | head -10
  fi
else
  echo "⚠️  Geen project gelinkt"
  echo "   Link project via: supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "   Of via dashboard:"
  echo "   1. Ga naar https://supabase.com/dashboard"
  echo "   2. Selecteer je project"
  echo "   3. Ga naar Settings → General"
  echo "   4. Kopieer de Project Reference ID"
  echo "   5. Run: supabase link --project-ref YOUR_PROJECT_REF"
  exit 1
fi

echo ""
echo "============================================================"
echo "📊 Database Status:"
echo ""

# Check migrations status
echo "Migrations status:"
if supabase migration list &> /dev/null; then
  MIGRATIONS=$(supabase migration list 2>/dev/null || echo "")
  if [ -n "$MIGRATIONS" ]; then
    echo "$MIGRATIONS"
  else
    echo "⚠️  Kon migraties niet ophalen"
  fi
else
  echo "⚠️  Kon migratie status niet checken"
fi

echo ""
echo "============================================================"
echo "🔒 RLS Policies Check:"
echo ""
echo "Om RLS policies te checken, run dit SQL commando in Supabase SQL Editor:"
echo ""
echo "SELECT"
echo "  schemaname,"
echo "  tablename,"
echo "  policyname,"
echo "  cmd as command,"
echo "  roles::text as roles,"
echo "  qual as using_expression"
echo "FROM pg_policies"
echo "WHERE schemaname = 'public'"
echo "ORDER BY tablename, policyname;"
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
echo "⚠️  Deze configuratie moet handmatig worden gecontroleerd in Supabase Dashboard:"
echo ""
echo "1. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/url-configuration"
echo ""
echo "2. Controleer:"
echo "   ✅ Site URL: https://ocaso-rewrite.vercel.app (of je productie URL)"
echo "   ✅ Redirect URLs bevatten:"
echo "      - https://ocaso-rewrite.vercel.app/auth/callback"
echo "      - http://localhost:3000/auth/callback"
echo ""
echo "3. Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/providers"
echo ""
echo "4. Controleer OAuth Providers:"
echo "   ✅ Google: Enabled, Client ID en Secret ingevuld"
echo "   ✅ Facebook: Enabled, App ID en Secret ingevuld"
echo ""

echo "============================================================"
echo "🌐 External OAuth Configuration:"
echo ""
echo "⚠️  Controleer ook externe OAuth configuratie:"
echo ""
echo "Google Cloud Console:"
echo "  URL: https://console.cloud.google.com/apis/credentials"
echo "  ✅ Authorized redirect URIs bevat:"
echo "     https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
echo ""
echo "Facebook Developers:"
echo "  URL: https://developers.facebook.com/apps"
echo "  ✅ Valid OAuth Redirect URIs bevat:"
echo "     https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
echo ""

echo "============================================================"
echo "📋 Database Schema Check:"
echo ""
echo "Om database schema te checken, run dit SQL commando:"
echo ""
echo "SELECT"
echo "  table_name,"
echo "  column_name,"
echo "  data_type"
echo "FROM information_schema.columns"
echo "WHERE table_schema = 'public'"
echo "  AND table_name IN ('profiles', 'listings', 'categories', 'subcategories')"
echo "ORDER BY table_name, ordinal_position;"
echo ""

echo "Kritieke kolommen die moeten bestaan:"
echo "  ✅ profiles.bio (text)"
echo "  ✅ profiles.business_plan (text)"
echo "  ✅ listings.status (text)"
echo ""

echo "============================================================"
echo "✅ Checklist voor Supabase Cloud:"
echo ""
echo "Database:"
echo "  [ ] Alle migraties zijn toegepast"
echo "  [ ] RLS policies zijn correct ingesteld"
echo "  [ ] Kritieke kolommen bestaan"
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
echo "💡 Tip: Gebruik Supabase Dashboard voor volledige configuratie:"
echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
echo ""

