#!/usr/bin/env node
/**
 * Test script voor subscription verwijderen en activatie
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

async function testSubscriptionRemoveAndActivate() {
  console.log('🧪 TEST: SUBSCRIPTION VERWIJDEREN EN ACTIVATIE');
  console.log('=' .repeat(60));
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

  // TEST 1: Abonnement toevoegen
  console.log('TEST 1: Abonnement toevoegen');
  console.log('─'.repeat(60));
  const testPlan = 'basis_maandelijks';
  
  const { error: addError } = await supabase
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

  if (addError) {
    console.error('❌ Error bij toevoegen:', addError.message);
    process.exit(1);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const { data: afterAdd } = await supabase
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .single();

  console.log(`   business_plan: ${afterAdd?.business_plan}`);
  console.log(`   business.subscription_active: ${afterAdd?.business?.subscription_active}`);
  console.log(`   business.plan: ${afterAdd?.business?.plan}`);
  
  if (afterAdd?.business_plan === testPlan && afterAdd?.business?.subscription_active === true) {
    console.log('✅ Abonnement succesvol toegevoegd');
  } else {
    console.log('❌ Abonnement niet correct toegevoegd');
  }
  console.log('');

  // TEST 2: Abonnement verwijderen
  console.log('TEST 2: Abonnement verwijderen');
  console.log('─'.repeat(60));
  
  // Haal eerst bestaande business op
  const { data: beforeRemove } = await supabase
    .from('profiles')
    .select('business')
    .eq('id', testUser.id)
    .single();
  
  const existingBusiness = beforeRemove?.business || {};
  
  const { error: removeError } = await supabase
    .from('profiles')
    .update({
      business_plan: null,
      business: {
        ...existingBusiness,
        subscription_active: false,
        subscription_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', testUser.id);

  if (removeError) {
    console.error('❌ Error bij verwijderen:', removeError.message);
    process.exit(1);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const { data: afterRemove } = await supabase
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .single();

  console.log(`   business_plan: ${afterRemove?.business_plan || 'null'}`);
  console.log(`   business.subscription_active: ${afterRemove?.business?.subscription_active}`);
  
  if (!afterRemove?.business_plan && afterRemove?.business?.subscription_active === false) {
    console.log('✅ Abonnement succesvol verwijderd');
  } else {
    console.log('❌ Abonnement niet correct verwijderd');
    console.log(`   Verwacht: business_plan=null, subscription_active=false`);
    console.log(`   Kreeg: business_plan=${afterRemove?.business_plan}, subscription_active=${afterRemove?.business?.subscription_active}`);
  }
  console.log('');

  // TEST 3: Abonnement opnieuw toevoegen (activatie test)
  console.log('TEST 3: Abonnement opnieuw toevoegen (activatie test)');
  console.log('─'.repeat(60));
  
  const { error: reactivateError } = await supabase
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

  if (reactivateError) {
    console.error('❌ Error bij reactiveren:', reactivateError.message);
  } else {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: afterReactivate } = await supabase
      .from('profiles')
      .select('business_plan, business')
      .eq('id', testUser.id)
      .single();

    console.log(`   business_plan: ${afterReactivate?.business_plan}`);
    console.log(`   business.subscription_active: ${afterReactivate?.business?.subscription_active}`);
    
    if (afterReactivate?.business_plan === testPlan && afterReactivate?.business?.subscription_active === true) {
      console.log('✅ Abonnement succesvol geactiveerd');
    } else {
      console.log('❌ Abonnement niet correct geactiveerd');
    }
  }
  console.log('');

  // Restore original values
  console.log('Herstellen originele waarden...');
  const restoreData = { business_plan: originalPlan || null };
  if (originalBusiness) {
    restoreData.business = originalBusiness;
  }
  
  await supabase
    .from('profiles')
    .update(restoreData)
    .eq('id', testUser.id);

  console.log('✅ Originele waarden hersteld');
  console.log('');

  console.log('=' .repeat(60));
  console.log('✅ TESTS VOLTOOID');
  console.log('=' .repeat(60));
}

testSubscriptionRemoveAndActivate().catch(console.error);

