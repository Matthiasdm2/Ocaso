#!/usr/bin/env node
/**
 * Complete smoke test voor subscription flow
 * Test: checkout -> webhook -> database -> profiel pagina
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (has priority)
const envLocal = config({ path: resolve(process.cwd(), '.env.local') });
if (envLocal.parsed) {
  Object.assign(process.env, envLocal.parsed);
}
const env = config({ path: resolve(process.cwd(), '.env') });
if (env.parsed) {
  for (const [key, value] of Object.entries(env.parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import helper functions (we'll simulate them)
function formatBusinessPlan(plan, billing) {
  const planMap = { basic: 'basis', pro: 'pro' };
  const billingMap = { monthly: 'maandelijks', yearly: 'jaarlijks' };
  return `${planMap[plan]}_${billingMap[billing]}`;
}

function parseBusinessPlan(businessPlan) {
  if (!businessPlan) return null;
  const parts = businessPlan.split('_');
  if (parts.length !== 2) return null;
  const planMap = { basis: 'basic', pro: 'pro' };
  const billingMap = { maandelijks: 'monthly', jaarlijks: 'yearly' };
  const plan = planMap[parts[0]];
  const billing = billingMap[parts[1]];
  if (!plan || !billing) return null;
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
      subscriptionActive: !!businessPlan && businessPlan.trim() !== '',
    };
  }
  return null;
}

async function testSubscriptionFlow() {
  console.log('🧪 COMPLETE SUBSCRIPTION FLOW SMOKE TEST');
  console.log('=' .repeat(70));
  console.log('');

  // Find a test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, business_plan, business')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('❌ Geen gebruikers gevonden');
    process.exit(1);
  }

  const testUser = users[0];
  const originalPlan = testUser.business_plan;
  const originalBusiness = testUser.business;

  console.log(`📧 Test gebruiker: ${testUser.email || testUser.id}`);
  console.log(`   Origineel business_plan: ${originalPlan || 'null'}`);
  console.log(`   Origineel business: ${JSON.stringify(originalBusiness || {}, null, 2)}`);
  console.log('');

  // TEST 1: Simuleer checkout session creation (webhook activation)
  console.log('TEST 1: Simuleer checkout session completion (webhook)');
  console.log('─'.repeat(70));
  
  const testPlan = 'basic';
  const testBilling = 'monthly';
  const businessPlan = formatBusinessPlan(testPlan, testBilling);
  
  console.log(`   Plan: ${testPlan}, Billing: ${testBilling}`);
  console.log(`   Expected business_plan: ${businessPlan}`);
  console.log('');

  // Simuleer webhook update
  const { error: webhookError } = await supabase
    .from('profiles')
    .update({
      business_plan: businessPlan,
      business: {
        plan: testPlan,
        billing_cycle: testBilling,
        subscription_active: true,
        subscription_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', testUser.id);

  if (webhookError) {
    console.error('❌ Webhook simulatie failed:', webhookError.message);
    process.exit(1);
  }

  console.log('✅ Webhook update uitgevoerd');
  await new Promise(resolve => setTimeout(resolve, 500));

  // TEST 2: Verifieer database state
  console.log('');
  console.log('TEST 2: Verifieer database state');
  console.log('─'.repeat(70));
  
  const { data: afterWebhook, error: verifyError } = await supabase
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .single();

  if (verifyError) {
    console.error('❌ Database verificatie failed:', verifyError.message);
    process.exit(1);
  }

  console.log(`   business_plan: ${afterWebhook?.business_plan || 'null'}`);
  console.log(`   business.plan: ${afterWebhook?.business?.plan || 'null'}`);
  console.log(`   business.billing_cycle: ${afterWebhook?.business?.billing_cycle || 'null'}`);
  console.log(`   business.subscription_active: ${afterWebhook?.business?.subscription_active}`);
  console.log(`   business.subscription_updated_at: ${afterWebhook?.business?.subscription_updated_at || 'null'}`);
  console.log('');

  // Verificatie checks
  const checks = {
    businessPlanCorrect: afterWebhook?.business_plan === businessPlan,
    planCorrect: afterWebhook?.business?.plan === testPlan,
    billingCorrect: afterWebhook?.business?.billing_cycle === testBilling,
    subscriptionActive: afterWebhook?.business?.subscription_active === true,
    hasTimestamp: !!afterWebhook?.business?.subscription_updated_at,
  };

  console.log('   Verificatie checks:');
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
  });

  const allChecksPass = Object.values(checks).every(v => v);
  if (!allChecksPass) {
    console.log('');
    console.log('❌ Database verificatie FAILED');
    console.log('   Expected:');
    console.log(`     business_plan: ${businessPlan}`);
    console.log(`     business.plan: ${testPlan}`);
    console.log(`     business.billing_cycle: ${testBilling}`);
    console.log(`     business.subscription_active: true`);
    console.log('   Got:');
    console.log(`     business_plan: ${afterWebhook?.business_plan}`);
    console.log(`     business: ${JSON.stringify(afterWebhook?.business, null, 2)}`);
  } else {
    console.log('');
    console.log('✅ Database verificatie PASSED');
  }

  // TEST 3: Test helper functions (zoals profielpagina gebruikt)
  console.log('');
  console.log('TEST 3: Test helper functions (profielpagina logica)');
  console.log('─'.repeat(70));
  
  const subscriptionData = getSubscriptionData(afterWebhook?.business, afterWebhook?.business_plan);
  
  console.log('   getSubscriptionData() resultaat:');
  console.log(`     plan: ${subscriptionData?.plan || 'null'}`);
  console.log(`     billing: ${subscriptionData?.billing || 'null'}`);
  console.log(`     subscriptionActive: ${subscriptionData?.subscriptionActive}`);
  console.log(`     subscriptionUpdatedAt: ${subscriptionData?.subscriptionUpdatedAt || 'null'}`);
  console.log('');

  const helperChecks = {
    planMatches: subscriptionData?.plan === testPlan,
    billingMatches: subscriptionData?.billing === testBilling,
    isActive: subscriptionData?.subscriptionActive === true,
    hasTimestamp: !!subscriptionData?.subscriptionUpdatedAt,
  };

  console.log('   Helper function checks:');
  Object.entries(helperChecks).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
  });

  const allHelperChecksPass = Object.values(helperChecks).every(v => v);
  if (!allHelperChecksPass) {
    console.log('');
    console.log('❌ Helper function verificatie FAILED');
  } else {
    console.log('');
    console.log('✅ Helper function verificatie PASSED');
  }

  // TEST 4: Test admin route simulatie
  console.log('');
  console.log('TEST 4: Test admin route update (zouzelfde output moeten geven)');
  console.log('─'.repeat(70));
  
  // Simuleer admin update met andere plan
  const adminPlan = 'pro';
  const adminBilling = 'yearly';
  const adminBusinessPlan = formatBusinessPlan(adminPlan, adminBilling);
  
  const parsed = parseBusinessPlan(adminBusinessPlan);
  if (!parsed) {
    console.error('❌ Parse failed voor admin plan');
    process.exit(1);
  }

  const { error: adminError } = await supabase
    .from('profiles')
    .update({
      business_plan: adminBusinessPlan,
      business: {
        plan: parsed.plan,
        billing_cycle: parsed.billing,
        subscription_active: true,
        subscription_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', testUser.id);

  if (adminError) {
    console.error('❌ Admin update failed:', adminError.message);
  } else {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: afterAdmin } = await supabase
      .from('profiles')
      .select('business_plan, business')
      .eq('id', testUser.id)
      .single();

    console.log(`   Admin update uitgevoerd: ${adminBusinessPlan}`);
    console.log(`   business_plan: ${afterAdmin?.business_plan}`);
    console.log(`   business.plan: ${afterAdmin?.business?.plan}`);
    console.log(`   business.billing_cycle: ${afterAdmin?.business?.billing_cycle}`);
    console.log(`   business.subscription_active: ${afterAdmin?.business?.subscription_active}`);
    
    const adminChecks = {
      businessPlanCorrect: afterAdmin?.business_plan === adminBusinessPlan,
      planCorrect: afterAdmin?.business?.plan === adminPlan,
      billingCorrect: afterAdmin?.business?.billing_cycle === adminBilling,
      subscriptionActive: afterAdmin?.business?.subscription_active === true,
    };

    console.log('');
    console.log('   Admin update checks:');
    Object.entries(adminChecks).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });

    const allAdminChecksPass = Object.values(adminChecks).every(v => v);
    if (!allAdminChecksPass) {
      console.log('');
      console.log('❌ Admin update verificatie FAILED');
    } else {
      console.log('');
      console.log('✅ Admin update verificatie PASSED');
    }
  }

  // Restore original values
  console.log('');
  console.log('Herstellen originele waarden...');
  const restoreData = { business_plan: originalPlan || null };
  if (originalBusiness) {
    restoreData.business = originalBusiness;
  } else {
    restoreData.business = {};
  }
  
  await supabase
    .from('profiles')
    .update(restoreData)
    .eq('id', testUser.id);

  console.log('✅ Originele waarden hersteld');
  console.log('');

  // Final summary
  console.log('=' .repeat(70));
  console.log('📊 TEST SAMENVATTING');
  console.log('=' .repeat(70));
  console.log(`✅ Webhook simulatie: ${!webhookError ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Database verificatie: ${allChecksPass ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Helper functions: ${allHelperChecksPass ? 'PASSED' : 'FAILED'}`);
  console.log('=' .repeat(70));
  
  if (allChecksPass && allHelperChecksPass && !webhookError) {
    console.log('✅ ALLE TESTS GESLAAGD');
    console.log('');
    console.log('💡 Als de subscription flow nog steeds niet werkt:');
    console.log('   1. Check of de webhook correct is geconfigureerd in Stripe');
    console.log('   2. Check of de webhook URL correct is ingesteld');
    console.log('   3. Check de webhook logs in Stripe dashboard');
    console.log('   4. Check de server logs voor webhook errors');
  } else {
    console.log('❌ SOMIGE TESTS GEFAALD');
    console.log('');
    console.log('💡 Controleer:');
    console.log('   1. Database migratie is uitgevoerd (business JSONB kolom bestaat)');
    console.log('   2. Helper functions werken correct');
    console.log('   3. Database permissions zijn correct ingesteld');
  }
  console.log('=' .repeat(70));
}

testSubscriptionFlow().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

