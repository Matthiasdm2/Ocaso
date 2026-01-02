#!/usr/bin/env tsx
/**
 * OAuth Configuration Test Script
 * 
 * Dit script test de OAuth configuratie zonder daadwerkelijk in te loggen.
 * Het verifieert:
 * - Environment variables
 * - OAuth URL generatie
 * - Redirect URL format
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

console.log('=== OAuth Configuration Test ===\n');

// Test 1: Environment Variables
console.log('1. Environment Variables Check:');
const envChecks = {
  'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
  'NEXT_PUBLIC_SITE_URL': SITE_URL,
};

let envPassed = true;
for (const [key, value] of Object.entries(envChecks)) {
  const isValid = value && value !== 'NOT SET';
  console.log(`   ${isValid ? '✅' : '❌'} ${key}: ${value}`);
  if (!isValid) envPassed = false;
}
console.log('');

if (!envPassed) {
  console.error('❌ Environment variables zijn niet correct ingesteld!');
  process.exit(1);
}

// Test 2: Supabase Client Creation
console.log('2. Supabase Client Test:');
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('   ✅ Supabase client aangemaakt');
} catch (error) {
  console.error('   ❌ Fout bij aanmaken Supabase client:', error);
  process.exit(1);
}
console.log('');

// Test 3: OAuth URL Generation
console.log('3. OAuth URL Generation Test:');
const expectedRedirectTo = `${SITE_URL}/auth/callback`;
console.log(`   Verwachte redirectTo: ${expectedRedirectTo}`);

async function testOAuthURL(provider: 'google' | 'facebook') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: expectedRedirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.log(`   ❌ ${provider}: Fout - ${error.message}`);
      return false;
    }

    if (!data?.url) {
      console.log(`   ❌ ${provider}: Geen redirect URL ontvangen`);
      return false;
    }

    // Verify URL format
    const url = new URL(data.url);
    const isValid = 
      url.hostname === 'dmnowaqinfkhovhyztan.supabase.co' &&
      url.pathname === '/auth/v1/authorize' &&
      url.searchParams.get('provider') === provider &&
      url.searchParams.get('redirect_to') === expectedRedirectTo;

    if (isValid) {
      console.log(`   ✅ ${provider}: URL correct gegenereerd`);
      console.log(`      ${data.url.substring(0, 80)}...`);
      return true;
    } else {
      console.log(`   ⚠️  ${provider}: URL gegenereerd maar format afwijkend`);
      console.log(`      ${data.url}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${provider}: Exception - ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const googleResult = await testOAuthURL('google');
console.log('');

// Test 4: Expected Configuration
console.log('4. Expected Configuration:');
console.log(`   Supabase Project: ${SUPABASE_URL}`);
console.log(`   Site URL: ${SITE_URL}`);
console.log(`   Redirect To: ${expectedRedirectTo}`);
console.log(`   Supabase Callback (voor Google/Facebook): https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback`);
console.log('');

// Test 5: Manual Checklist
console.log('5. Manual Checklist (controleer handmatig):');
console.log('   [ ] Google Cloud Console → Authorized redirect URIs bevat:');
console.log('       https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback');
console.log('   [ ] Supabase Dashboard → Authentication → Providers → Google:');
console.log('       - Enabled: Aan');
console.log('       - Client ID: Ingevuld');
console.log('       - Client Secret: Ingevuld');
console.log('   [ ] Supabase Dashboard → Authentication → URL Configuration:');
console.log(`       - Site URL: ${SITE_URL}`);
console.log(`       - Redirect URLs bevat: ${expectedRedirectTo}`);
console.log('');

// Summary
console.log('=== Test Summary ===');
if (googleResult) {
  console.log('✅ OAuth URL generatie werkt correct');
  console.log('');
  console.log('⚠️  Let op: Dit test alleen de URL generatie.');
  console.log('   Voor een volledige test moet je handmatig:');
  console.log('   1. Ga naar http://localhost:3000/login');
  console.log('   2. Klik op "Verder met Google"');
  console.log('   3. Klik op "Ga naar Google"');
  console.log('   4. Je zou naar Google moeten gaan (niet blijven hangen)');
} else {
  console.log('❌ OAuth URL generatie heeft problemen');
  console.log('   Controleer de configuratie in Supabase Dashboard');
}

