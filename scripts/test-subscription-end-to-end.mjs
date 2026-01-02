#!/usr/bin/env node
/**
 * End-to-end test: checkout API -> webhook -> profielpagina
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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Simuleer profielpagina logica
function getSubscriptionData(business, businessPlan) {
  if (business?.plan && business?.billing_cycle) {
    const subscriptionActive = business.subscription_active !== undefined 
      ? !!business.subscription_active 
      : true;
    return {
      plan: String(business.plan).toLowerCase(),
      billing: String(business.billing_cycle).toLowerCase(),
      subscriptionActive,
      subscriptionUpdatedAt: business.subscription_updated_at ? String(business.subscription_updated_at) : undefined,
    };
  }
  
  // Fallback naar business_plan parsing
  if (businessPlan && businessPlan.trim() !== '') {
    const parts = businessPlan.split('_');
    if (parts.length === 2) {
      const planMap = { basis: 'basic', pro: 'pro' };
      const billingMap = { maandelijks: 'monthly', jaarlijks: 'yearly' };
      const plan = planMap[parts[0]];
      const billing = billingMap[parts[1]];
      if (plan && billing) {
        return {
          plan,
          billing,
          subscriptionActive: true,
        };
      }
    }
  }
  
  return null;
}

async function testEndToEnd() {
  console.log('🧪 END-TO-END SUBSCRIPTION FLOW TEST');
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
  console.log(`   Origineel subscriptionActive: ${getSubscriptionData(testUser.business, testUser.business_plan)?.subscriptionActive || false}`);
  console.log('');

  // TEST 1: Simuleer webhook update (zoals checkout zou doen)
  console.log('TEST 1: Simuleer webhook update (checkout completion)');
  console.log('─'.repeat(70));
  
  const testPlan = 'basic';
  const testBilling = 'monthly';
  const businessPlan = `basis_${testBilling === 'monthly' ? 'maandelijks' : 'jaarlijks'}`;
  
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

  // TEST 2: Test profielpagina query (zoals de pagina doet)
  console.log('');
  console.log('TEST 2: Test profielpagina query (client-side)');
  console.log('─'.repeat(70));
  
  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Profiel query failed:', profileError.message);
    console.error('   Dit kan een RLS (Row Level Security) probleem zijn!');
  } else {
    console.log('✅ Profiel query succesvol');
    console.log(`   business_plan: ${profileData?.business_plan || 'null'}`);
    console.log(`   business: ${JSON.stringify(profileData?.business || {}, null, 2)}`);
    
    // Test profielpagina logica
    const subscriptionData = getSubscriptionData(profileData?.business, profileData?.business_plan);
    console.log('');
    console.log('   Profielpagina subscription data:');
    console.log(`     plan: ${subscriptionData?.plan || 'null'}`);
    console.log(`     billing: ${subscriptionData?.billing || 'null'}`);
    console.log(`     subscriptionActive: ${subscriptionData?.subscriptionActive}`);
    
    const profileChecks = {
      hasData: !!subscriptionData,
      planMatches: subscriptionData?.plan === testPlan,
      billingMatches: subscriptionData?.billing === testBilling,
      isActive: subscriptionData?.subscriptionActive === true,
    };

    console.log('');
    console.log('   Profielpagina checks:');
    Object.entries(profileChecks).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });

    if (!profileChecks.isActive) {
      console.log('');
      console.log('⚠️  PROBLEEM GEVONDEN: subscriptionActive is false!');
      console.log('   Dit betekent dat shop velden NIET zichtbaar zijn');
      console.log('');
      console.log('   Debug info:');
      console.log(`     business.subscription_active: ${profileData?.business?.subscription_active}`);
      console.log(`     business.plan: ${profileData?.business?.plan}`);
      console.log(`     business.billing_cycle: ${profileData?.business?.billing_cycle}`);
      console.log(`     business_plan: ${profileData?.business_plan}`);
    }
  }

  // TEST 3: Test met admin client (zoals admin route doet)
  console.log('');
  console.log('TEST 3: Test met admin client (admin route)');
  console.log('─'.repeat(70));
  
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('profiles')
    .select('business_plan, business')
    .eq('id', testUser.id)
    .single();

  if (adminError) {
    console.error('❌ Admin query failed:', adminError.message);
  } else {
    console.log('✅ Admin query succesvol');
    const adminSubscriptionData = getSubscriptionData(adminData?.business, adminData?.business_plan);
    console.log(`   subscriptionActive: ${adminSubscriptionData?.subscriptionActive}`);
    
    if (adminSubscriptionData?.subscriptionActive && !profileData?.business?.subscription_active) {
      console.log('');
      console.log('⚠️  PROBLEEM GEVONDEN: RLS blokkeert mogelijk data!');
      console.log('   Admin ziet subscription_active: true');
      console.log('   Client ziet subscription_active: false/undefined');
      console.log('   → Check RLS policies op profiles tabel');
    }
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

  // Summary
  console.log('=' .repeat(70));
  console.log('📊 DIAGNOSE');
  console.log('=' .repeat(70));
  
  if (profileError) {
    console.log('❌ RLS PROBLEEM: Client kan profiel niet lezen');
    console.log('   → Check Row Level Security policies');
  } else if (!profileData?.business?.subscription_active) {
    console.log('❌ SUBSCRIPTION ACTIVE PROBLEEM');
    console.log('   → subscription_active is niet true in business JSONB');
    console.log('   → Check webhook logs');
    console.log('   → Check of webhook correct wordt getriggerd');
  } else {
    console.log('✅ Database en queries werken correct');
    console.log('   → Probleem ligt waarschijnlijk bij:');
    console.log('     1. Webhook wordt niet getriggerd');
    console.log('     2. Webhook URL is niet correct ingesteld');
    console.log('     3. Webhook signature verificatie faalt');
  }
  console.log('=' .repeat(70));
}

testEndToEnd().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

