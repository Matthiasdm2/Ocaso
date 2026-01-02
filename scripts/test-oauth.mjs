#!/usr/bin/env node
/**
 * OAuth Configuration Test Script
 * 
 * Test de OAuth configuratie zonder daadwerkelijk in te loggen.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local if it exists
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (e) {
    // .env.local doesn't exist, that's okay
  }
}

loadEnv();

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
  console.error('   Zorg dat .env.local bestaat met NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Test 2: Supabase Client Creation
console.log('2. Supabase Client Test:');
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('   ✅ Supabase client aangemaakt');
} catch (error) {
  console.error('   ❌ Fout bij aanmaken Supabase client:', error.message);
  process.exit(1);
}
console.log('');

// Test 3: OAuth URL Generation
console.log('3. OAuth URL Generation Test:');
const expectedRedirectTo = `${SITE_URL}/auth/callback`;
console.log(`   Verwachte redirectTo: ${expectedRedirectTo}\n`);

async function testOAuthURL(provider) {
  try {
    console.log(`   Testing ${provider}...`);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: expectedRedirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.log(`   ❌ ${provider}: Fout - ${error.message}`);
      if (error.message.includes('not enabled')) {
        console.log(`      → ${provider} is niet enabled in Supabase Dashboard`);
      }
      if (error.message.includes('redirect')) {
        console.log(`      → Controleer redirect URL configuratie`);
      }
      return false;
    }

    if (!data?.url) {
      console.log(`   ❌ ${provider}: Geen redirect URL ontvangen`);
      console.log(`      → Controleer of ${provider} is geconfigureerd in Supabase Dashboard`);
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
      console.log(`      URL: ${data.url.substring(0, 100)}...`);
      return true;
    } else {
      console.log(`   ⚠️  ${provider}: URL gegenereerd maar format afwijkend`);
      console.log(`      Hostname: ${url.hostname}`);
      console.log(`      Pathname: ${url.pathname}`);
      console.log(`      Provider: ${url.searchParams.get('provider')}`);
      console.log(`      Redirect To: ${url.searchParams.get('redirect_to')}`);
      console.log(`      Full URL: ${data.url}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${provider}: Exception - ${error.message}`);
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
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Ga naar: http://localhost:3000/login');
  console.log('   3. Klik op "Verder met Google"');
  console.log('   4. Klik op "Ga naar Google"');
  console.log('   5. Je zou naar Google moeten gaan (niet blijven hangen op Supabase pagina)');
  console.log('');
  console.log('   Als je blijft hangen op Supabase pagina:');
  console.log('   → Google OAuth is niet geconfigureerd in Supabase Dashboard');
  console.log('   → Controleer Authentication → Providers → Google');
} else {
  console.log('❌ OAuth URL generatie heeft problemen');
  console.log('   Controleer de configuratie in Supabase Dashboard');
  console.log('   Zie: docs/OAUTH_GOOGLE_SETUP.md voor instructies');
}

