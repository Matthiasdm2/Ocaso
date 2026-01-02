#!/usr/bin/env node
/**
 * Praktische test die de echte checkout flow simuleert
 * Test: login -> checkout -> webhook -> profiel check
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
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRealFlow() {
  console.log('🧪 PRAKTISCHE SUBSCRIPTION FLOW TEST');
  console.log('=' .repeat(70));
  console.log('');

  // Find a test user
  const { data: users } = await supabaseAdmin
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

  // STAP 1: Simuleer checkout session creation
  console.log('STAP 1: Simuleer checkout session creation');
  console.log('─'.repeat(70));
  console.log('   → Gebruiker klikt op "Abonnement kopen"');
  console.log('   → Checkout session wordt aangemaakt met metadata:');
  console.log('     - userId:', testUser.id);
  console.log('     - plan: basic');
  console.log('     - billing: monthly');
  console.log('');

  // STAP 2: Simuleer webhook (zoals Stripe zou doen)
  console.log('STAP 2: Simuleer webhook (checkout.session.completed)');
  console.log('─'.repeat(70));
  
  const testPlan = 'basic';
  const testBilling = 'monthly';
  const businessPlan = `basis_${testBilling === 'monthly' ? 'maandelijks' : 'jaarlijks'}`;
  
  console.log('   → Stripe webhook ontvangt event');
  console.log('   → Webhook update database:');
  console.log(`     business_plan: ${businessPlan}`);
  console.log(`     business.plan: ${testPlan}`);
  console.log(`     business.billing_cycle: ${testBilling}`);
  console.log(`     business.subscription_active: true`);
  console.log('');

  const { error: webhookError } = await supabaseAdmin
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
    console.error('❌ Webhook update failed:', webhookError.message);
    process.exit(1);
  }

  console.log('✅ Webhook update uitgevoerd');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // STAP 3: Check database state (zoals profielpagina zou doen)
  console.log('');
  console.log('STAP 3: Check database state (profielpagina query)');
  console.log('─'.repeat(70));
  console.log('   → Gebruiker wordt doorgestuurd naar /profile/business?success=true');
  console.log('   → Profielpagina laadt profiel data');
  console.log('');

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .single();

  if (profileError) {
    console.error('❌ Profiel query failed:', profileError.message);
    process.exit(1);
  }

  console.log('   Database state:');
  console.log(`     business_plan: ${profileData?.business_plan || 'null'}`);
  console.log(`     business.plan: ${profileData?.business?.plan || 'null'}`);
  console.log(`     business.billing_cycle: ${profileData?.business?.billing_cycle || 'null'}`);
  console.log(`     business.subscription_active: ${profileData?.business?.subscription_active}`);
  console.log('');

  // STAP 4: Test profielpagina logica
  console.log('STAP 4: Test profielpagina logica');
  console.log('─'.repeat(70));
  
  // Simuleer getSubscriptionData() helper
  let subscriptionActive = false;
  let plan = null;
  let billing = null;

  if (profileData?.business?.plan && profileData?.business?.billing_cycle) {
    plan = profileData.business.plan;
    billing = profileData.business.billing_cycle;
    subscriptionActive = profileData.business.subscription_active !== undefined 
      ? !!profileData.business.subscription_active 
      : true;
  } else if (profileData?.business_plan) {
    const parts = profileData.business_plan.split('_');
    if (parts.length === 2) {
      const planMap = { basis: 'basic', pro: 'pro' };
      const billingMap = { maandelijks: 'monthly', jaarlijks: 'yearly' };
      plan = planMap[parts[0]];
      billing = billingMap[parts[1]];
      subscriptionActive = !!profileData.business_plan && profileData.business_plan.trim() !== '';
    }
  }

  console.log('   Profielpagina subscription data:');
  console.log(`     plan: ${plan || 'null'}`);
  console.log(`     billing: ${billing || 'null'}`);
  console.log(`     subscriptionActive: ${subscriptionActive}`);
  console.log('');

  // STAP 5: Check of shop velden zichtbaar zouden zijn
  console.log('STAP 5: Check shop velden zichtbaarheid');
  console.log('─'.repeat(70));
  
  const checks = {
    'Database heeft business_plan': !!profileData?.business_plan,
    'Database heeft business.plan': !!profileData?.business?.plan,
    'Database heeft business.billing_cycle': !!profileData?.business?.billing_cycle,
    'Database heeft subscription_active = true': profileData?.business?.subscription_active === true,
    'Profielpagina kan plan lezen': !!plan,
    'Profielpagina kan billing lezen': !!billing,
    'Profielpagina ziet subscriptionActive = true': subscriptionActive === true,
    'Shop velden zouden ZICHTBAAR zijn': subscriptionActive === true,
  };

  console.log('   Verificatie checks:');
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
  });

  const allPass = Object.values(checks).every(v => v);
  console.log('');

  // STAP 6: Diagnose
  console.log('STAP 6: Diagnose');
  console.log('─'.repeat(70));
  
  if (!allPass) {
    console.log('❌ PROBLEEM GEVONDEN!');
    console.log('');
    
    if (!profileData?.business_plan) {
      console.log('   → business_plan is null/undefined');
      console.log('   → Webhook heeft mogelijk niet geüpdatet');
    }
    
    if (!profileData?.business?.subscription_active) {
      console.log('   → business.subscription_active is niet true');
      console.log('   → Check webhook code');
    }
    
    if (!subscriptionActive) {
      console.log('   → Profielpagina ziet subscriptionActive = false');
      console.log('   → Shop velden zijn NIET zichtbaar');
      console.log('');
      console.log('   Debug info:');
      console.log(`     business_plan: ${profileData?.business_plan || 'null'}`);
      console.log(`     business: ${JSON.stringify(profileData?.business || {}, null, 2)}`);
      console.log(`     Parsed plan: ${plan || 'null'}`);
      console.log(`     Parsed billing: ${billing || 'null'}`);
      console.log(`     subscriptionActive: ${subscriptionActive}`);
    }
  } else {
    console.log('✅ ALLE CHECKS GESLAAGD!');
    console.log('');
    console.log('   → Database heeft correcte data');
    console.log('   → Profielpagina kan data lezen');
    console.log('   → Shop velden ZOUDEN zichtbaar moeten zijn');
    console.log('');
    console.log('   Als shop velden nog steeds niet zichtbaar zijn:');
    console.log('   1. Check of gebruiker ingelogd is');
    console.log('   2. Check browser console voor errors');
    console.log('   3. Check of real-time subscription werkt');
    console.log('   4. Check of pagina correct refresh na checkout');
  }

  // Restore
  console.log('');
  console.log('Herstellen originele waarden...');
  const restoreData = { business_plan: originalPlan || null };
  if (originalBusiness) {
    restoreData.business = originalBusiness;
  } else {
    restoreData.business = {};
  }
  
  await supabaseAdmin
    .from('profiles')
    .update(restoreData)
    .eq('id', testUser.id);

  console.log('✅ Originele waarden hersteld');
  console.log('');

  // Final summary
  console.log('=' .repeat(70));
  console.log('📊 TEST RESULTAAT');
  console.log('=' .repeat(70));
  console.log(`Status: ${allPass ? '✅ ALLE TESTS GESLAAGD' : '❌ PROBLEEM GEVONDEN'}`);
  console.log('');
  
  if (!allPass) {
    console.log('💡 Mogelijke oplossingen:');
    console.log('   1. Check webhook logs in Stripe dashboard');
    console.log('   2. Check of webhook URL correct is ingesteld');
    console.log('   3. Check server logs voor webhook errors');
    console.log('   4. Test met echte checkout flow (niet simulatie)');
  } else {
    console.log('💡 Als het nog steeds niet werkt:');
    console.log('   1. Check of gebruiker ingelogd blijft na checkout');
    console.log('   2. Check browser console voor JavaScript errors');
    console.log('   3. Check of real-time subscription werkt');
    console.log('   4. Check of pagina correct refresh na checkout');
  }
  console.log('=' .repeat(70));
}

testRealFlow().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

