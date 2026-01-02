#!/usr/bin/env node
/**
 * Test admin subscription assignment
 * Simuleert wat er gebeurt wanneer je een abonnement toewijst via admin dashboard
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function testAdminAssignment() {
  console.log('🧪 TEST: ADMIN SUBSCRIPTION ASSIGNMENT');
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

  // Simuleer admin assignment (zoals admin dashboard doet)
  console.log('STAP 1: Simuleer admin assignment');
  console.log('─'.repeat(70));
  console.log('   → Admin klikt op "Toewijzen" met plan: basis_maandelijks');
  console.log('   → PUT /api/admin/subscriptions/[id] wordt aangeroepen');
  console.log('');

  const businessPlan = 'basis_maandelijks';
  const parsed = parseBusinessPlan(businessPlan);

  if (!parsed) {
    console.error('❌ Parse failed voor:', businessPlan);
    process.exit(1);
  }

  console.log('   Parsed plan:', parsed);
  console.log('');

  // Haal eerst bestaande business JSONB op
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('business')
    .eq('id', testUser.id)
    .maybeSingle();

  const existingBusiness = (currentProfile?.business || {});

  console.log('   Bestaande business:', JSON.stringify(existingBusiness, null, 2));
  console.log('');

  // Bereid update data voor (zoals admin route doet)
  const updateData = {
    business_plan: businessPlan,
    business: {
      plan: parsed.plan,
      billing_cycle: parsed.billing,
      subscription_active: true,
      subscription_updated_at: new Date().toISOString(),
    },
  };

  console.log('   Update data:', JSON.stringify(updateData, null, 2));
  console.log('');

  // Voer update uit
  console.log('STAP 2: Voer database update uit');
  console.log('─'.repeat(70));

  const { data: updateResult, error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', testUser.id)
    .select('id, business_plan, business')
    .single();

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    console.error('   Code:', updateError.code);
    console.error('   Details:', updateError.details);
    console.error('   Hint:', updateError.hint);
    process.exit(1);
  }

  console.log('✅ Update uitgevoerd');
  console.log('   Result:', JSON.stringify(updateResult, null, 2));
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 500));

  // Verifieer
  console.log('STAP 3: Verifieer database state');
  console.log('─'.repeat(70));

  const { data: verifyData, error: verifyError } = await supabase
    .from('profiles')
    .select('id, business_plan, business')
    .eq('id', testUser.id)
    .single();

  if (verifyError) {
    console.error('❌ Verificatie failed:', verifyError.message);
    process.exit(1);
  }

  console.log('   business_plan:', verifyData?.business_plan);
  console.log('   business:', JSON.stringify(verifyData?.business || {}, null, 2));
  console.log('');

  // Checks
  const checks = {
    'business_plan is gezet': verifyData?.business_plan === businessPlan,
    'business.plan is gezet': verifyData?.business?.plan === parsed.plan,
    'business.billing_cycle is gezet': verifyData?.business?.billing_cycle === parsed.billing,
    'business.subscription_active is true': verifyData?.business?.subscription_active === true,
    'business.subscription_updated_at bestaat': !!verifyData?.business?.subscription_updated_at,
  };

  console.log('   Verificatie checks:');
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
  });

  const allPass = Object.values(checks).every(v => v);
  console.log('');

  if (!allPass) {
    console.log('❌ PROBLEEM GEVONDEN!');
    console.log('');
    console.log('   Expected:');
    console.log(`     business_plan: ${businessPlan}`);
    console.log(`     business.plan: ${parsed.plan}`);
    console.log(`     business.billing_cycle: ${parsed.billing}`);
    console.log(`     business.subscription_active: true`);
    console.log('');
    console.log('   Got:');
    console.log(`     business_plan: ${verifyData?.business_plan}`);
    console.log(`     business: ${JSON.stringify(verifyData?.business || {}, null, 2)}`);
  } else {
    console.log('✅ ALLE CHECKS GESLAAGD!');
    console.log('');
    console.log('   → Database update werkt correct');
    console.log('   → Beide kolommen zijn geüpdatet');
    console.log('   → Subscription is actief');
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

  await supabase
    .from('profiles')
    .update(restoreData)
    .eq('id', testUser.id);

  console.log('✅ Originele waarden hersteld');
  console.log('');

  // Summary
  console.log('=' .repeat(70));
  console.log('📊 TEST RESULTAAT');
  console.log('=' .repeat(70));
  console.log(`Status: ${allPass ? '✅ GESLAAGD' : '❌ GEFAALD'}`);
  console.log('');

  if (!allPass) {
    console.log('💡 Mogelijke oorzaken:');
    console.log('   1. Database permissions probleem');
    console.log('   2. RLS policies blokkeren update');
    console.log('   3. Database constraint violation');
    console.log('   4. JSONB kolom bestaat niet');
  } else {
    console.log('💡 Als admin dashboard nog steeds niet werkt:');
    console.log('   1. Check browser console voor errors');
    console.log('   2. Check network tab voor API response');
    console.log('   3. Check of admin route correct wordt aangeroepen');
    console.log('   4. Check server logs voor errors');
  }
  console.log('=' .repeat(70));
}

testAdminAssignment().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

