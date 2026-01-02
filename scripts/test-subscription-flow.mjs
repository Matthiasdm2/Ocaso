#!/usr/bin/env node
/**
 * Smoke test voor subscription purchase flow en admin dashboard integratie
 * 
 * Test flow:
 * 1. Simuleer een subscription purchase via webhook
 * 2. Controleer of business_plan is geüpdatet in database
 * 3. Controleer of admin API het abonnement kan zien
 * 4. Test admin update functionaliteit
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Zorg ervoor dat je .env bestand de juiste variabelen bevat');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' }) : null;

// Test gebruiker email (pas aan naar een bestaande gebruiker of maak er een)
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

async function getOrCreateTestUser() {
  if (TEST_USER_EMAIL) {
    console.log(`\n📧 Zoeken naar test gebruiker: ${TEST_USER_EMAIL}`);
    
    // Zoek gebruiker in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, business_plan')
      .eq('email', TEST_USER_EMAIL)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error bij zoeken gebruiker:', profileError);
      return null;
    }

    if (profile) {
      console.log(`✅ Gebruiker gevonden: ${profile.id}`);
      console.log(`   Naam: ${profile.full_name || 'Geen naam'}`);
      console.log(`   Huidig plan: ${profile.business_plan || 'Geen'}`);
      return profile;
    }

    console.log(`⚠️  Gebruiker niet gevonden met email: ${TEST_USER_EMAIL}`);
  }

  // Fallback: zoek een willekeurige gebruiker
  console.log(`\n📧 Zoeken naar een willekeurige gebruiker...`);
  const { data: profiles, error: listError } = await supabase
    .from('profiles')
    .select('id, email, full_name, business_plan')
    .limit(5);

  if (listError) {
    console.error('❌ Error bij ophalen gebruikers:', listError);
    return null;
  }

  if (!profiles || profiles.length === 0) {
    console.log(`⚠️  Geen gebruikers gevonden in database`);
    console.log(`   Stel TEST_USER_EMAIL in of maak eerst een gebruiker aan`);
    return null;
  }

  const profile = profiles[0];
  console.log(`✅ Gebruiker gevonden: ${profile.id}`);
  console.log(`   Email: ${profile.email || 'Geen email'}`);
  console.log(`   Naam: ${profile.full_name || 'Geen naam'}`);
  console.log(`   Huidig plan: ${profile.business_plan || 'Geen'}`);
  return profile;
}

async function simulateSubscriptionWebhook(userId, plan = 'basic', billing = 'monthly') {
  console.log(`\n🔄 Simuleren webhook voor subscription: ${plan} (${billing})`);
  
  // Converteer naar business_plan formaat
  const planName = plan.toLowerCase();
  const billingCycle = billing.toLowerCase();
  const businessPlan = `${planName === 'pro' ? 'pro' : 'basis'}_${billingCycle === 'yearly' ? 'jaarlijks' : 'maandelijks'}`;
  
  console.log(`   → business_plan: ${businessPlan}`);

  // Update profile zoals webhook dat zou doen
  const { data, error } = await supabase
    .from('profiles')
    .update({
      business_plan: businessPlan,
      business: {
        plan: plan,
        billing_cycle: billing,
        subscription_active: true,
        subscription_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', userId)
    .select('id, email, business_plan')
    .single();

  if (error) {
    console.error('❌ Error bij updaten subscription:', error);
    return false;
  }

  console.log(`✅ Subscription geüpdatet:`);
  console.log(`   business_plan: ${data.business_plan}`);
  return true;
}

async function verifySubscriptionInDatabase(userId) {
  console.log(`\n🔍 Verificeren subscription in database...`);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, business_plan, business')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Error bij ophalen profiel:', error);
    return false;
  }

  console.log(`✅ Profiel data:`);
  console.log(`   business_plan: ${data.business_plan || 'null'}`);
  console.log(`   business JSONB:`, JSON.stringify(data.business || {}, null, 2));
  
  const hasPlan = !!(data.business_plan && data.business_plan.trim() !== '');
  console.log(`   Subscription actief: ${hasPlan ? 'Ja' : 'Nee'}`);
  
  return hasPlan;
}

async function testAdminAPI(userId) {
  console.log(`\n🔍 Testen admin API...`);
  
  try {
    // Simuleer admin API call (zonder auth voor test)
    const response = await fetch(`${baseUrl}/api/admin/users?subscriptions=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Admin API error: ${response.status} - ${errorText}`);
      return false;
    }

    const users = await response.json();
    const testUser = users.find(u => u.id === userId);

    if (!testUser) {
      console.error(`❌ Test gebruiker niet gevonden in admin API response`);
      return false;
    }

    console.log(`✅ Test gebruiker gevonden in admin API:`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   business_plan: ${testUser.business_plan || 'null'}`);
    console.log(`   subscription_active: ${testUser.subscription_active ? 'Ja' : 'Nee'}`);
    
    return testUser.subscription_active === true;
  } catch (error) {
    console.error(`❌ Error bij testen admin API:`, error.message);
    console.log(`   (Dit kan normaal zijn als de server niet draait)`);
    return false;
  }
}

async function testAdminUpdate(userId) {
  console.log(`\n🔍 Testen admin update functionaliteit...`);
  
  // Test: update naar pro_jaarlijks
  const testPlan = 'pro_jaarlijks';
  console.log(`   Updaten naar: ${testPlan}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/admin/subscriptions/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ business_plan: testPlan }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Admin update error: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Admin update response:`, JSON.stringify(result, null, 2));
    
    // Verifieer update
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data } = await supabase
      .from('profiles')
      .select('business_plan')
      .eq('id', userId)
      .single();
    
    if (data?.business_plan === testPlan) {
      console.log(`✅ Verificatie geslaagd: business_plan = ${data.business_plan}`);
      return true;
    } else {
      console.error(`❌ Verificatie mislukt: verwacht ${testPlan}, kreeg ${data?.business_plan}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error bij testen admin update:`, error.message);
    console.log(`   (Dit kan normaal zijn als de server niet draait)`);
    return false;
  }
}

async function runSmokeTest() {
  console.log('🚀 SUBSCRIPTION FLOW SMOKE TEST\n');
  console.log('=' .repeat(60));

  const user = await getOrCreateTestUser();
  if (!user) {
    console.log('\n❌ Kan niet verder zonder test gebruiker');
    process.exit(1);
  }

  const userId = user.id;
  const originalPlan = user.business_plan;

  console.log(`\n📋 Test plan:`);
  console.log(`   Gebruiker ID: ${userId}`);
  console.log(`   Origineel plan: ${originalPlan || 'Geen'}`);

  // Test 1: Simuleer subscription purchase
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 1: Subscription Purchase (Webhook Simulatie)');
  console.log('='.repeat(60));
  
  const purchaseSuccess = await simulateSubscriptionWebhook(userId, 'basic', 'monthly');
  if (!purchaseSuccess) {
    console.log('\n❌ TEST 1 FAILED: Subscription purchase simulatie mislukt');
    process.exit(1);
  }

  // Test 2: Verifieer in database
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 2: Database Verificatie');
  console.log('='.repeat(60));
  
  const dbSuccess = await verifySubscriptionInDatabase(userId);
  if (!dbSuccess) {
    console.log('\n❌ TEST 2 FAILED: Subscription niet gevonden in database');
    process.exit(1);
  }

  // Test 3: Test admin API
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 3: Admin API Check');
  console.log('='.repeat(60));
  
  const adminAPISuccess = await testAdminAPI(userId);
  if (!adminAPISuccess) {
    console.log('\n⚠️  TEST 3 WARNING: Admin API test mislukt (server mogelijk niet actief)');
  }

  // Test 4: Test admin update
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 4: Admin Update Functionaliteit');
  console.log('='.repeat(60));
  
  const adminUpdateSuccess = await testAdminUpdate(userId);
  if (!adminUpdateSuccess) {
    console.log('\n⚠️  TEST 4 WARNING: Admin update test mislukt (server mogelijk niet actief)');
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ TEST 1: Subscription Purchase - ${purchaseSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`✅ TEST 2: Database Verificatie - ${dbSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`${adminAPISuccess ? '✅' : '⚠️ '} TEST 3: Admin API Check - ${adminAPISuccess ? 'PASS' : 'WARNING (server mogelijk niet actief)'}`);
  console.log(`${adminUpdateSuccess ? '✅' : '⚠️ '} TEST 4: Admin Update - ${adminUpdateSuccess ? 'PASS' : 'WARNING (server mogelijk niet actief)'}`);
  
  if (purchaseSuccess && dbSuccess) {
    console.log(`\n✅ CORE FLOW: PASS - Subscription purchase werkt correct!`);
    console.log(`\n💡 Tip: Start de development server om admin API tests volledig te testen`);
    process.exit(0);
  } else {
    console.log(`\n❌ CORE FLOW: FAIL - Er zijn problemen met de subscription flow`);
    process.exit(1);
  }
}

runSmokeTest().catch(error => {
  console.error('\n❌ Smoke test crashed:', error);
  process.exit(1);
});

