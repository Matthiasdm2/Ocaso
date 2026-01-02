#!/bin/bash

# Script om OAuth configuratie te controleren
# Gebruik: ./scripts/check-oauth-config.sh

echo "=== OAuth Configuratie Checker ==="
echo ""

# Check environment variables
echo "1. Environment Variables:"
echo "   NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL:-NOT SET}"
echo "   NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL:-NOT SET}"
echo "   NEXT_PUBLIC_ENABLE_OAUTH: ${NEXT_PUBLIC_ENABLE_OAUTH:-NOT SET}"
echo "   NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-NOT SET}"
echo ""

# Check Supabase project
echo "2. Supabase Project:"
if command -v supabase &> /dev/null; then
    echo "   Supabase CLI: ✅ Geïnstalleerd"
    PROJECT_REF=$(supabase projects list 2>/dev/null | grep "●" | awk '{print $4}' | head -1)
    if [ -n "$PROJECT_REF" ]; then
        echo "   Project Reference: $PROJECT_REF"
        echo "   Project URL: https://$PROJECT_REF.supabase.co"
    else
        echo "   ⚠️  Geen gelinkt project gevonden"
    fi
else
    echo "   ⚠️  Supabase CLI niet geïnstalleerd"
fi
echo ""

# Expected redirect URLs
echo "3. Verwachte Redirect URLs:"
echo "   Voor lokaal: http://localhost:3000/auth/callback"
echo "   Voor productie: https://ocaso.be/auth/callback"
echo "   Voor preview: https://ocaso-rewrite.vercel.app/auth/callback"
echo ""

# Supabase callback URL
echo "4. Supabase Callback URL (voor Google/Facebook configuratie):"
if [ -n "$PROJECT_REF" ]; then
    echo "   https://$PROJECT_REF.supabase.co/auth/v1/callback"
else
    echo "   https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
fi
echo ""

echo "=== Checklist ==="
echo ""
echo "Controleer in Supabase Dashboard (https://supabase.com/dashboard):"
echo "  1. Authentication → URL Configuration"
echo "     - Site URL: http://localhost:3000 (voor lokaal)"
echo "     - Redirect URLs moet bevatten:"
echo "       • http://localhost:3000/auth/callback"
echo "       • https://ocaso.be/auth/callback"
echo ""
echo "  2. Authentication → Providers"
echo "     - Google: enabled met Client ID & Secret"
echo "     - Facebook: enabled met App ID & Secret"
echo ""
echo "Controleer in Google Cloud Console:"
echo "  3. APIs & Services → Credentials → OAuth 2.0 Client ID"
echo "     - Authorized redirect URIs moet bevatten:"
echo "       • https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
echo ""
echo "Controleer in Facebook App Settings:"
echo "  4. Facebook Login → Settings"
echo "     - Valid OAuth Redirect URIs moet bevatten:"
echo "       • https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback"
echo ""

