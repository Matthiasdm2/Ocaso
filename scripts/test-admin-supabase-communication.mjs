#!/usr/bin/env node
/**
 * Test Supabase communication with admin dashboard
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

async function testAdminCommunication() {
  console.log('🧪 TEST: ADMIN DASHBOARD ↔ SUPABASE COMMUNICATION');
  console.log('='.repeat(70));
  console.log('');

  // TEST 1: Check basic connection
  console.log('TEST 1: Basic Supabase Connection');
  console.log('─'.repeat(70));
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ Connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase connection OK');
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return;
  }
  console.log('');

  // TEST 2: Test admin users query (simulating /api/admin/users)
  console.log('TEST 2: Admin Users Query (simulating /api/admin/users)');
  console.log('─'.repeat(70));
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, account_type, is_admin, is_business, avatar_url, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Query failed:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log(`✅ Query successful: ${data?.length || 0} users found`);
      if (data && data.length > 0) {
        console.log('   Sample user:', {
          id: data[0].id,
          email: data[0].email,
          full_name: data[0].full_name,
        });
      }
    }
  } catch (error) {
    console.log('❌ Query error:', error.message);
  }
  console.log('');

  // TEST 3: Test subscriptions query (simulating /api/admin/users?subscriptions=true)
  console.log('TEST 3: Subscriptions Query (simulating /api/admin/users?subscriptions=true)');
  console.log('─'.repeat(70));
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, business_plan, business')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Query failed:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log(`✅ Query successful: ${data?.length || 0} users found`);
      if (data && data.length > 0) {
        const userWithSub = data.find(u => u.business_plan || u.business);
        if (userWithSub) {
          console.log('   User with subscription:', {
            id: userWithSub.id,
            email: userWithSub.email,
            business_plan: userWithSub.business_plan,
            business: userWithSub.business,
          });
        } else {
          console.log('   No users with subscriptions found');
        }
      }
    }
  } catch (error) {
    console.log('❌ Query error:', error.message);
  }
  console.log('');

  // TEST 4: Test subscription update (simulating /api/admin/subscriptions/[id])
  console.log('TEST 4: Subscription Update (simulating PUT /api/admin/subscriptions/[id])');
  console.log('─'.repeat(70));
  try {
    // Find a user to test with
    const { data: testUsers } = await supabase
      .from('profiles')
      .select('id, email, business_plan, business')
      .limit(1);
    
    if (!testUsers || testUsers.length === 0) {
      console.log('⚠️  No users found for update test');
    } else {
      const testUser = testUsers[0];
      const originalPlan = testUser.business_plan;
      const originalBusiness = testUser.business;
      
      console.log(`   Testing with user: ${testUser.email || testUser.id}`);
      console.log(`   Original business_plan: ${originalPlan || 'null'}`);
      
      // Test update (we'll revert it)
      const testPlan = originalPlan === 'basis_maandelijks' ? 'pro_maandelijks' : 'basis_maandelijks';
      
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ business_plan: testPlan })
        .eq('id', testUser.id)
        .select();
      
      if (updateError) {
        console.log('❌ Update failed:', updateError.message);
      } else {
        console.log('✅ Update successful');
        
        // Revert the change
        await supabase
          .from('profiles')
          .update({ business_plan: originalPlan, business: originalBusiness })
          .eq('id', testUser.id);
        
        console.log('✅ Reverted test update');
      }
    }
  } catch (error) {
    console.log('❌ Update error:', error.message);
  }
  console.log('');

  // TEST 5: Check column existence
  console.log('TEST 5: Column Existence Check');
  console.log('─'.repeat(70));
  const requiredColumns = [
    'id',
    'full_name',
    'email',
    'account_type',
    'is_admin',
    'is_business',
    'business_plan',
    'business',
  ];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(requiredColumns.join(', '))
      .limit(1);
    
    if (error) {
      console.log('❌ Column check failed:', error.message);
      if (error.message.includes('column') || error.code === 'PGRST116') {
        console.log('   ⚠️  Some columns may not exist in the database');
        console.log('   Check your database schema and migrations');
      }
    } else {
      console.log('✅ All required columns exist');
    }
  } catch (error) {
    console.log('❌ Column check error:', error.message);
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ Communication test completed!');
  console.log('');
  console.log('💡 Tips:');
  console.log('   - If queries fail, check Supabase Dashboard → Database → Tables');
  console.log('   - If columns are missing, check migrations in supabase/migrations/');
  console.log('   - If service role key fails, check SUPABASE_SERVICE_ROLE_KEY format');
  console.log('   - Service role key should start with "eyJ" (JWT token)');
}

testAdminCommunication().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

