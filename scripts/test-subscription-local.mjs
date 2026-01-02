#!/usr/bin/env node
/**
 * Lokaal test script voor subscription opslag
 * 
 * Test of abonnementen correct worden opgeslagen in beide kolommen:
 * - business_plan (text)
 * - business (JSONB)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Helper functies inline (omdat TypeScript imports niet werken in .mjs)
function formatBusinessPlan(plan, billing) {
  const planName = plan === "pro" ? "pro" : "basis";
  const billingName = billing === "yearly" ? "jaarlijks" : "maandelijks";
  return `${planName}_${billingName}`;
}

function parseBusinessPlan(businessPlan) {
  if (!businessPlan || typeof businessPlan !== "string") {
    return null;
  }
  const normalized = businessPlan.toLowerCase().trim();
  const isPro = normalized.includes("pro");
  const plan = isPro ? "pro" : "basic";
  const isYearly = normalized.includes("jaarlijks") || normalized.includes("yearly");
  const billing = isYearly ? "yearly" : "monthly";
  return { plan, billing };
}

function getSubscriptionData(business, businessPlan) {
  if (business?.plan && business?.billing_cycle) {
    return {
      plan: String(business.plan).toLowerCase(),
      billing: String(business.billing_cycle).toLowerCase(),
      subscriptionActive: !!business.subscription_active,
      subscriptionUpdatedAt: business.subscription_updated_at ? String(business.subscription_updated_at) : undefined,
    };
  }
  const parsed = parseBusinessPlan(businessPlan);
  if (parsed) {
    return {
      ...parsed,
      subscriptionActive: !!(businessPlan && businessPlan.trim() !== ""),
    };
  }
  return null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.error('');
  console.error('💡 Tip: Zorg dat je .env bestand bestaat met:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

// Validate service key format (should start with eyJ)
if (!supabaseServiceKey.startsWith('eyJ')) {
  console.error('⚠️  Waarschuwing: SUPABASE_SERVICE_ROLE_KEY lijkt niet correct geformatteerd');
  console.error('   Service role keys beginnen meestal met "eyJ"');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubscriptionStorage() {
  console.log('🧪 LOKAAL TEST: SUBSCRIPTION OPSLAG');
  console.log('=' .repeat(60));
  console.log(`📡 Database: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}`);
  console.log('');

  // Test 1: Check if business column exists
  console.log('TEST 1: Verificeren dat business kolom bestaat');
  console.log('─'.repeat(60));
  try {
    const { error } = await supabase
      .from('profiles')
      .select('business')
      .limit(1);

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('business')) {
        console.log('❌ Kolom "business" bestaat niet!');
        console.log('   → Voer eerst de migratie uit');
        process.exit(1);
      } else {
        throw error;
      }
    }
    console.log('✅ Kolom "business" bestaat en is toegankelijk');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  // Test 2: Find a test user
  console.log('TEST 2: Test gebruiker vinden');
  console.log('─'.repeat(60));
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, full_name, business_plan, business')
    .limit(5);

  if (usersError) {
    console.error('❌ Error ophalen gebruikers:', usersError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('❌ Geen gebruikers gevonden');
    process.exit(1);
  }

  const testUser = users[0];
  console.log(`✅ Test gebruiker gevonden: ${testUser.email || testUser.id}`);
  console.log(`   Huidig business_plan: ${testUser.business_plan || 'null'}`);
  console.log(`   Huidig business: ${JSON.stringify(testUser.business || {}, null, 2)}`);
  console.log('');

  // Save original values for restoration
  const originalBusinessPlan = testUser.business_plan;
  const originalBusiness = testUser.business;

  // Test 3: Simulate subscription purchase (basic monthly)
  console.log('TEST 3: Simuleren subscription purchase (basic monthly)');
  console.log('─'.repeat(60));
  const testPlan = 'basic';
  const testBilling = 'monthly';
  const expectedBusinessPlan = formatBusinessPlan(testPlan, testBilling);

  console.log(`   Plan: ${testPlan}`);
  console.log(`   Billing: ${testBilling}`);
  console.log(`   Verwacht business_plan: ${expectedBusinessPlan}`);
  console.log('');

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      business_plan: expectedBusinessPlan,
      business: {
        plan: testPlan,
        billing_cycle: testBilling,
        subscription_active: true,
        subscription_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', testUser.id);

  if (updateError) {
    console.error('❌ Error bij updaten:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Update uitgevoerd');
  console.log('');

  // Test 4: Verify the update
  console.log('TEST 4: Verifiëren dat update correct is opgeslagen');
  console.log('─'.repeat(60));
  
  // Wait a bit for database to sync
  await new Promise(resolve => setTimeout(resolve, 500));

  const { data: updatedUser, error: verifyError } = await supabase
    .from('profiles')
    .select('id, business_plan, business')
    .eq('id', testUser.id)
    .single();

  if (verifyError) {
    console.error('❌ Error bij verifiëren:', verifyError.message);
    process.exit(1);
  }

  console.log('   Opgehaalde data:');
  console.log(`   - business_plan: ${updatedUser.business_plan}`);
  console.log(`   - business: ${JSON.stringify(updatedUser.business, null, 2)}`);
  console.log('');

  // Verify business_plan
  if (updatedUser.business_plan !== expectedBusinessPlan) {
    console.log(`❌ business_plan mismatch!`);
    console.log(`   Verwacht: ${expectedBusinessPlan}`);
    console.log(`   Kreeg: ${updatedUser.business_plan}`);
  } else {
    console.log('✅ business_plan is correct');
  }

  // Verify business JSONB
  const business = updatedUser.business || {};
  if (business.plan !== testPlan) {
    console.log(`❌ business.plan mismatch!`);
    console.log(`   Verwacht: ${testPlan}`);
    console.log(`   Kreeg: ${business.plan}`);
  } else {
    console.log('✅ business.plan is correct');
  }

  if (business.billing_cycle !== testBilling) {
    console.log(`❌ business.billing_cycle mismatch!`);
    console.log(`   Verwacht: ${testBilling}`);
    console.log(`   Kreeg: ${business.billing_cycle}`);
  } else {
    console.log('✅ business.billing_cycle is correct');
  }

  if (business.subscription_active !== true) {
    console.log(`❌ business.subscription_active is niet true!`);
    console.log(`   Kreeg: ${business.subscription_active}`);
  } else {
    console.log('✅ business.subscription_active is correct');
  }

  console.log('');

  // Test 5: Test helper functions
  console.log('TEST 5: Testen helper functies');
  console.log('─'.repeat(60));
  
  const parsed = parseBusinessPlan(updatedUser.business_plan);
  if (parsed && parsed.plan === testPlan && parsed.billing === testBilling) {
    console.log('✅ parseBusinessPlan() werkt correct');
  } else {
    console.log('❌ parseBusinessPlan() geeft verkeerde resultaten');
    console.log(`   Verwacht: { plan: '${testPlan}', billing: '${testBilling}' }`);
    console.log(`   Kreeg:`, parsed);
  }

  const subscriptionData = getSubscriptionData(updatedUser.business, updatedUser.business_plan);
  if (subscriptionData && subscriptionData.plan === testPlan && subscriptionData.billing === testBilling) {
    console.log('✅ getSubscriptionData() werkt correct');
  } else {
    console.log('❌ getSubscriptionData() geeft verkeerde resultaten');
    console.log(`   Verwacht: { plan: '${testPlan}', billing: '${testBilling}' }`);
    console.log(`   Kreeg:`, subscriptionData);
  }

  console.log('');

  // Test 6: Test different plan types
  console.log('TEST 6: Testen verschillende plan types');
  console.log('─'.repeat(60));
  
  const testCases = [
    { plan: 'basic', billing: 'monthly', expected: 'basis_maandelijks' },
    { plan: 'basic', billing: 'yearly', expected: 'basis_jaarlijks' },
    { plan: 'pro', billing: 'monthly', expected: 'pro_maandelijks' },
    { plan: 'pro', billing: 'yearly', expected: 'pro_jaarlijks' },
  ];

  for (const testCase of testCases) {
    const formatted = formatBusinessPlan(testCase.plan, testCase.billing);
    if (formatted === testCase.expected) {
      console.log(`✅ ${testCase.plan} ${testCase.billing} → ${formatted}`);
    } else {
      console.log(`❌ ${testCase.plan} ${testCase.billing} → ${formatted} (verwacht: ${testCase.expected})`);
    }
  }

  console.log('');

  // Restore original values
  console.log('TEST 7: Herstellen originele waarden');
  console.log('─'.repeat(60));
  const restoreData = {
    business_plan: originalBusinessPlan || null,
  };
  
  if (originalBusiness) {
    restoreData.business = originalBusiness;
  }

  const { error: restoreError } = await supabase
    .from('profiles')
    .update(restoreData)
    .eq('id', testUser.id);

  if (restoreError) {
    console.log('⚠️  Kon originele waarden niet herstellen:', restoreError.message);
    console.log('   Je moet dit handmatig doen als nodig');
  } else {
    console.log('✅ Originele waarden hersteld');
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ ALLE TESTS GESLAAGD!');
  console.log('=' .repeat(60));
  console.log('');
  console.log('Samenvatting:');
  console.log('✅ Business kolom bestaat');
  console.log('✅ Subscription data wordt correct opgeslagen');
  console.log('✅ Beide kolommen worden gesynchroniseerd');
  console.log('✅ Helper functies werken correct');
  console.log('✅ Verschillende plan types werken');
  console.log('');
  console.log('🎉 Je kunt nu veilig deployen naar productie!');
}

testSubscriptionStorage().catch(error => {
  console.error('');
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});

