#!/usr/bin/env node
/**
 * Manual subscription activation voor lokale testing
 * Simuleert webhook zonder Stripe
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import readline from 'readline';

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

function formatBusinessPlan(plan, billing) {
  const planMap = { basic: 'basis', pro: 'pro' };
  const billingMap = { monthly: 'maandelijks', yearly: 'jaarlijks' };
  return `${planMap[plan]}_${billingMap[billing]}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function manualSubscriptionActivation() {
  console.log('🔧 MANUAL SUBSCRIPTION ACTIVATION (voor lokale testing)');
  console.log('=' .repeat(70));
  console.log('');

  // List users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, business_plan, business')
    .limit(10);

  if (!users || users.length === 0) {
    console.log('❌ Geen gebruikers gevonden');
    process.exit(1);
  }

  console.log('Beschikbare gebruikers:');
  users.forEach((user, index) => {
    const currentPlan = user.business_plan || 'geen';
    const isActive = user.business?.subscription_active || false;
    console.log(`  ${index + 1}. ${user.email || user.id} (plan: ${currentPlan}, active: ${isActive})`);
  });
  console.log('');

  const userIndex = await question('Selecteer gebruiker (nummer): ');
  const selectedUser = users[parseInt(userIndex) - 1];

  if (!selectedUser) {
    console.log('❌ Ongeldige selectie');
    process.exit(1);
  }

  console.log('');
  console.log(`Geselecteerde gebruiker: ${selectedUser.email || selectedUser.id}`);
  console.log(`Huidige plan: ${selectedUser.business_plan || 'geen'}`);
  console.log('');

  const planChoice = await question('Plan (basic/pro): ');
  const billingChoice = await question('Billing (monthly/yearly): ');

  const plan = planChoice.toLowerCase() === 'pro' ? 'pro' : 'basic';
  const billing = billingChoice.toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
  const businessPlan = formatBusinessPlan(plan, billing);

  console.log('');
  console.log('Activeren subscription:');
  console.log(`  Plan: ${plan}`);
  console.log(`  Billing: ${billing}`);
  console.log(`  business_plan: ${businessPlan}`);
  console.log('');

  const confirm = await question('Doorgaan? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Geannuleerd');
    rl.close();
    return;
  }

  console.log('');
  console.log('Activeren subscription...');

  // Simuleer webhook update
  const { error } = await supabase
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
    .eq('id', selectedUser.id);

  if (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Verify
  const { data: updated } = await supabase
    .from('profiles')
    .select('business_plan, business')
    .eq('id', selectedUser.id)
    .single();

  console.log('');
  console.log('✅ Subscription geactiveerd!');
  console.log('');
  console.log('Database state:');
  console.log(`  business_plan: ${updated?.business_plan}`);
  console.log(`  business.plan: ${updated?.business?.plan}`);
  console.log(`  business.billing_cycle: ${updated?.business?.billing_cycle}`);
  console.log(`  business.subscription_active: ${updated?.business?.subscription_active}`);
  console.log('');
  console.log('💡 Refresh je profielpagina om de wijzigingen te zien');
  console.log('   → Ga naar: http://localhost:3000/profile/business');
  console.log('   → Shop velden zouden nu zichtbaar moeten zijn');
  console.log('');

  rl.close();
}

manualSubscriptionActivation().catch((error) => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});

