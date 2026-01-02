#!/usr/bin/env node
/**
 * Test user deletion flow
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

async function testUserDelete() {
  console.log('🧪 TEST: USER DELETION FLOW');
  console.log('=' .repeat(70));
  console.log('');

  // Find a test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('❌ Geen gebruikers gevonden');
    process.exit(1);
  }

  const testUser = users[0];
  console.log(`📧 Test gebruiker: ${testUser.email || testUser.id}`);
  console.log('');

  // STAP 1: Check auth user exists
  console.log('STAP 1: Check auth user exists');
  console.log('─'.repeat(70));
  
  const { data: authUser, error: authGetError } = await supabase.auth.admin.getUserById(testUser.id);
  
  if (authGetError) {
    console.log('⚠️  Auth user lookup error:', authGetError.message);
    console.log('   Dit kan betekenen dat de auth user niet bestaat');
  } else if (authUser?.user) {
    console.log('✅ Auth user exists:', authUser.user.email);
  } else {
    console.log('⚠️  Auth user not found');
  }
  console.log('');

  // STAP 2: Check profile exists
  console.log('STAP 2: Check profile exists');
  console.log('─'.repeat(70));
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', testUser.id)
    .single();
  
  if (profileError) {
    console.log('❌ Profile lookup error:', profileError.message);
  } else if (profile) {
    console.log('✅ Profile exists:', profile.email);
  }
  console.log('');

  // STAP 3: Simulate delete (without actually deleting)
  console.log('STAP 3: Simulate delete flow');
  console.log('─'.repeat(70));
  console.log('   → DELETE /api/admin/users/[id] wordt aangeroepen');
  console.log('   → Auth user deletion wordt geprobeerd');
  console.log('   → Profile deletion wordt geprobeerd');
  console.log('');
  console.log('⚠️  ACTUAL DELETE NOT PERFORMED (test only)');
  console.log('');
  console.log('💡 Als gebruiker terugkomt na refresh:');
  console.log('   1. Check server logs voor auth deletion errors');
  console.log('   2. Check of SUPABASE_SERVICE_ROLE_KEY correct is');
  console.log('   3. Check of auth.admin.deleteUser() werkt');
  console.log('   4. Check of handle_new_user trigger actief is');
  console.log('');
  console.log('🔍 Debugging tips:');
  console.log('   - Check server terminal voor delete logs');
  console.log('   - Check Supabase Dashboard → Authentication → Users');
  console.log('   - Check of auth user echt wordt verwijderd');
  console.log('   - Als auth user niet wordt verwijderd, maakt trigger profile opnieuw aan');
  console.log('=' .repeat(70));
}

testUserDelete().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

