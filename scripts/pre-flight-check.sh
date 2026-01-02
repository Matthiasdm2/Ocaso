#!/bin/bash
# Pre-flight check script voor productie deployment
# Controleert of alles klaar staat om live te gaan
#
# Gebruik: ./scripts/pre-flight-check.sh
# Of: bash scripts/pre-flight-check.sh

set -e

PASS=0
FAIL=0
WARN=0

check_pass() {
  echo "✅ $1"
  ((PASS++))
}

check_fail() {
  echo "❌ $1"
  ((FAIL++))
}

check_warn() {
  echo "⚠️  $1"
  ((WARN++))
}

echo "🚀 Pre-flight check voor productie deployment"
echo "============================================================"

# 1. Check Supabase CLI
echo ""
echo "📦 Supabase CLI Checks:"
if command -v supabase &> /dev/null; then
  VERSION=$(supabase --version 2>/dev/null || echo "unknown")
  check_pass "Supabase CLI geïnstalleerd ($VERSION)"
  
  # Check if linked
  if supabase projects list &> /dev/null; then
    check_pass "Supabase project gelinkt"
  else
    check_warn "Supabase project niet gelinkt. Run: supabase link"
  fi
else
  check_fail "Supabase CLI niet geïnstalleerd. Installeer via: npm install -g supabase"
fi

# 2. Check Vercel CLI
echo ""
echo "🌐 Vercel CLI Checks:"
if command -v vercel &> /dev/null; then
  VERSION=$(vercel --version 2>/dev/null || echo "unknown")
  check_pass "Vercel CLI geïnstalleerd ($VERSION)"
  
  # Check if logged in
  if vercel whoami &> /dev/null; then
    USER=$(vercel whoami 2>/dev/null)
    check_pass "Vercel ingelogd als: $USER"
  else
    check_fail "Vercel niet ingelogd. Run: vercel login"
  fi
else
  check_fail "Vercel CLI niet geïnstalleerd. Installeer via: npm install -g vercel"
fi

# 3. Check Environment Variables
echo ""
echo "🔐 Environment Variables:"
if [ -f .env.local ]; then
  check_pass ".env.local bestand bestaat"
  
  # Check required vars
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    check_pass "NEXT_PUBLIC_SUPABASE_URL aanwezig"
  else
    check_fail "NEXT_PUBLIC_SUPABASE_URL ontbreekt"
  fi
  
  if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY aanwezig"
  else
    check_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt"
  fi
  
  if grep -q "NEXT_PUBLIC_SITE_URL" .env.local; then
    SITE_URL=$(grep "NEXT_PUBLIC_SITE_URL" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [[ $SITE_URL == https://* ]]; then
      check_pass "NEXT_PUBLIC_SITE_URL is HTTPS: $SITE_URL"
    elif [[ $SITE_URL == http://localhost* ]]; then
      check_warn "NEXT_PUBLIC_SITE_URL is lokaal: $SITE_URL (OK voor development)"
    else
      check_fail "NEXT_PUBLIC_SITE_URL is geen HTTPS URL: $SITE_URL"
    fi
  else
    check_fail "NEXT_PUBLIC_SITE_URL ontbreekt"
  fi
else
  check_warn ".env.local bestand niet gevonden (mogelijk alleen in Vercel)"
fi

# 4. Check Migrations
echo ""
echo "📊 Database Migrations:"
if [ -d "supabase/migrations" ]; then
  MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
  if [ "$MIGRATION_COUNT" -gt 0 ]; then
    check_pass "$MIGRATION_COUNT migratie(s) gevonden"
    
    # Check critical migrations
    if grep -r "profiles_select_public" supabase/migrations/*.sql &> /dev/null; then
      check_pass "Profiles RLS policy migratie gevonden"
    else
      check_warn "Profiles RLS policy migratie niet gevonden"
    fi
    
    if grep -r "listings_select_policy" supabase/migrations/*.sql &> /dev/null; then
      check_pass "Listings RLS policy migratie gevonden"
    else
      check_warn "Listings RLS policy migratie niet gevonden"
    fi
  else
    check_warn "Geen migraties gevonden"
  fi
else
  check_warn "supabase/migrations directory niet gevonden"
fi

# 5. Check Build
echo ""
echo "🏗️ Build Checks:"
if [ -f "package.json" ]; then
  check_pass "package.json bestaat"
  
  if grep -q '"build"' package.json; then
    check_pass "Build script aanwezig"
  else
    check_fail "Build script ontbreekt"
  fi
  
  # Try TypeScript check
  if command -v npx &> /dev/null; then
    if npx tsc --noEmit &> /dev/null; then
      check_pass "TypeScript check geslaagd"
    else
      check_fail "TypeScript errors gevonden. Run: npm run typecheck"
    fi
  else
    check_warn "Kon TypeScript niet checken (npx niet beschikbaar)"
  fi
else
  check_fail "package.json niet gevonden"
fi

# 6. Check OAuth Files
echo ""
echo "🔐 OAuth Configuration:"
if [ -f "app/auth/callback/route.ts" ]; then
  check_pass "OAuth callback route bestaat"
else
  check_fail "OAuth callback route ontbreekt"
fi

if [ -f "app/login/page.tsx" ]; then
  check_pass "Login pagina bestaat"
else
  check_fail "Login pagina ontbreekt"
fi

# 7. Check Vercel Project
echo ""
echo "🚀 Vercel Deployment:"
if vercel project ls &> /dev/null; then
  check_pass "Vercel project gevonden"
  
  # Check if there are deployments
  if vercel ls &> /dev/null; then
    check_pass "Vercel deployments gevonden"
  else
    check_warn "Geen Vercel deployments gevonden"
  fi
else
  check_warn "Vercel project niet gevonden. Run: vercel link"
fi

# Summary
echo ""
echo "============================================================"
echo ""
echo "📋 Summary:"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "⚠️  Warnings: $WARN"
echo ""

if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
  echo "🎉 Alles ziet er goed uit! Je kunt deployen."
  EXIT_CODE=0
elif [ $FAIL -eq 0 ]; then
  echo "✅ Geen kritieke problemen. Controleer waarschuwingen voordat je deployt."
  EXIT_CODE=0
else
  echo "🚨 KRITIEKE PROBLEMEN GEVONDEN!"
  echo "Los eerst de kritieke problemen op voordat je deployt."
  EXIT_CODE=1
fi

echo ""
echo "============================================================"
echo ""
echo "📝 Volgende stappen:"
echo "1. Los alle ❌ kritieke problemen op"
echo "2. Controleer ⚠️  waarschuwingen"
echo "3. Voer migraties uit: supabase migration up"
echo "4. Controleer OAuth configuratie in Supabase Dashboard"
echo "   - Authentication → URL Configuration"
echo "   - Authentication → Providers (Google/Facebook)"
echo "5. Deploy naar Vercel: vercel --prod"
echo ""

exit $EXIT_CODE

