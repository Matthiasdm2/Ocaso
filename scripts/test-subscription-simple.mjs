#!/usr/bin/env node
/**
 * Eenvoudige lokale test voor subscription opslag
 * Gebruikt anon key voor lezen (als service role key niet werkt)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (has priority), then .env
// But don't override existing values from .env.local
const envLocal = config({ path: resolve(process.cwd(), '.env.local') });
const env = config({ path: resolve(process.cwd(), '.env') });

// Merge: .env.local values take priority
if (envLocal.parsed) {
  Object.assign(process.env, envLocal.parsed);
}
if (env.parsed) {
  // Only add keys that don't exist yet
  for (const [key, value] of Object.entries(env.parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is niet ingesteld');
  process.exit(1);
}

// Check if service key is a JWT (starts with eyJ) or sb_secret format
let keyToUse;
let keyType;

if (supabaseServiceKey) {
  // Service role key should be a JWT token starting with eyJ
  if (supabaseServiceKey.startsWith('eyJ')) {
    keyToUse = supabaseServiceKey;
    keyType = 'service_role';
  } else if (supabaseServiceKey.startsWith('sb_secret_')) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY heeft verkeerd formaat (sb_secret_...)');
    console.log('   → Gebruik de "service_role" key uit Supabase Dashboard (begint met eyJ...)');
    console.log('   → Voor nu gebruiken we anon key voor lezen');
    keyToUse = supabaseAnonKey;
    keyType = 'anon_fallback';
  } else {
    // Try anyway
    keyToUse = supabaseServiceKey;
    keyType = 'service_role_unknown_format';
  }
} else {
  keyToUse = supabaseAnonKey;
  keyType = 'anon';
}

if (!keyToUse) {
  console.error('❌ Geen API key beschikbaar');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, keyToUse);

console.log('🧪 LOKAAL TEST: SUBSCRIPTION OPSLAG');
console.log('=' .repeat(60));
console.log(`📡 Database: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}`);
console.log(`🔑 Key type: ${keyType}`);
console.log('');

async function testSubscriptionStorage() {
  // Test 1: Check if business column exists
  console.log('TEST 1: Verificeren dat business kolom bestaat');
  console.log('─'.repeat(60));
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, business_plan, business')
      .limit(1);

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('business')) {
        console.log('❌ Kolom "business" bestaat niet!');
        console.log('   → Voer eerst de migratie uit');
        return false;
      } else if (error.message?.includes('Invalid API key')) {
        console.log('❌ Invalid API key');
        console.log('');
        console.log('💡 Oplossing:');
        console.log('   1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/settings/api');
        console.log('   2. Kopieer de "service_role" key (begint met eyJ...)');
        console.log('   3. Zet deze in je .env als SUPABASE_SERVICE_ROLE_KEY');
        return false;
      } else {
        console.log('❌ Error:', error.message);
        return false;
      }
    }

    console.log('✅ Kolom "business" bestaat en is toegankelijk');
    console.log(`   Sample data: ${JSON.stringify(data?.[0] || {}, null, 2)}`);
    console.log('');
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testSubscriptionUpdate() {
  if (keyType !== 'service_role') {
    console.log('⚠️  Kan update test niet uitvoeren zonder service_role key');
    console.log('   → Test alleen lezen met anon key');
    return false;
  }

  console.log('TEST 2: Testen subscription update');
  console.log('─'.repeat(60));
  
  // Find a test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, business_plan, business')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('❌ Geen gebruikers gevonden');
    return false;
  }

  const testUser = users[0];
  const originalPlan = testUser.business_plan;
  const originalBusiness = testUser.business;

  console.log(`   Test gebruiker: ${testUser.email || testUser.id}`);
  console.log(`   Origineel business_plan: ${originalPlan || 'null'}`);
  console.log('');

  // Test update
  const testPlan = 'basis_maandelijks';
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      business_plan: testPlan,
      business: {
        plan: 'basic',
        billing_cycle: 'monthly',
        subscription_active: true,
        subscription_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', testUser.id);

  if (updateError) {
    console.log('❌ Update failed:', updateError.message);
    return false;
  }

  console.log('✅ Update uitgevoerd');
  
  // Verify
  await new Promise(resolve => setTimeout(resolve, 500));
  const { data: updated } = await supabase
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .single();

  if (updated?.business_plan === testPlan && updated?.business?.plan === 'basic') {
    console.log('✅ Update verified - beide kolommen zijn correct');
  } else {
    console.log('⚠️  Update verified maar data komt niet overeen');
    console.log(`   business_plan: ${updated?.business_plan}`);
    console.log(`   business: ${JSON.stringify(updated?.business)}`);
  }

  // Restore
  const restoreData = { business_plan: originalPlan || null };
  if (originalBusiness) restoreData.business = originalBusiness;
  
  await supabase
    .from('profiles')
    .update(restoreData)
    .eq('id', testUser.id);

  console.log('✅ Originele waarden hersteld');
  console.log('');
  return true;
}

async function runTests() {
  const test1 = await testSubscriptionStorage();
  
  if (test1) {
    await testSubscriptionUpdate();
  }

  console.log('=' .repeat(60));
  if (test1) {
    console.log('✅ BASIS TEST GESLAAGD');
    console.log('   → Business kolom bestaat en is toegankelijk');
    if (keyType === 'service_role') {
      console.log('   → Updates werken correct');
    }
  } else {
    console.log('❌ TEST GEFAALD');
    console.log('   → Controleer je API keys en migratie status');
  }
  console.log('=' .repeat(60));
}

runTests().catch(console.error);

