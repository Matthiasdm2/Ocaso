#!/bin/bash

# Script om OAuth URLs te verifiëren
echo "=== OAuth URL Verificatie ==="
echo ""

# Expected URLs
EXPECTED_LOCAL="http://localhost:3000/auth/callback"
EXPECTED_PROD="https://ocaso.be/auth/callback"

echo "Verwachte URLs:"
echo "  Lokaal: $EXPECTED_LOCAL"
echo "  Productie: $EXPECTED_PROD"
echo ""

# Check if URLs are in Supabase (user moet dit handmatig checken)
echo "Controleer in Supabase Dashboard:"
echo "  1. Authentication → URL Configuration"
echo "     - Site URL moet zijn: http://localhost:3000 (voor lokaal)"
echo "     - Redirect URLs moet bevatten:"
echo "       • $EXPECTED_LOCAL"
echo "       • $EXPECTED_PROD"
echo ""
echo "  2. Belangrijk: De redirect URL moet EXACT overeenkomen"
echo "     - Geen trailing slash"
echo "     - Exacte match (localhost, niet 127.0.0.1)"
echo "     - http vs https moet kloppen"
echo ""

# Check current environment
echo "Huidige omgeving:"
if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then
    echo "  NEXT_PUBLIC_SITE_URL: $NEXT_PUBLIC_SITE_URL"
else
    echo "  NEXT_PUBLIC_SITE_URL: NIET INGESTELD"
fi

if [ -n "$NEXT_PUBLIC_BASE_URL" ]; then
    echo "  NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL"
else
    echo "  NEXT_PUBLIC_BASE_URL: NIET INGESTELD"
fi
echo ""

echo "=== Test Checklist ==="
echo ""
echo "1. Start de dev server: npm run dev"
echo "2. Ga naar: http://localhost:3000/login"
echo "3. Open browser console (F12)"
echo "4. Klik op 'Verder met Google' of 'Verder met Facebook'"
echo "5. Check de console logs voor de redirect URL"
echo "6. De redirect URL moet exact zijn: $EXPECTED_LOCAL"
echo "7. Als de redirect URL anders is, pas dan de code aan"
echo ""

