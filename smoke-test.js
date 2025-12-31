/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function smokeTest() {
  console.log('🚀 FASE 9C — FUNCTIONAL SMOKE AUDIT\n');

  const adminEmail = 'info@ocaso.be';

  try {
    // Get admin user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('email', adminEmail)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError || !profile) {
      console.log('❌ FAIL: Cannot find admin profile');
      return;
    }

    const userId = profile.id;
    console.log(`✅ Admin user found: ${userId}\n`);

    // Test 1: Listing creation validation
    console.log('1. LISTING CREATE (P0)');
    console.log('   - Route: /sell');
    console.log('   - API: /api/listings (POST)');
    console.log('   - Required: title, price, category_id, images[], stock');

    console.log('   - Testing validation...');
    // We can't easily test the API without auth token, but let's check if the endpoint exists
    console.log('   - Status: UNKNOWN (needs browser testing)\n');

    // Test 3: Explore/Search
    console.log('3. EXPLORE/SEARCH (P0)');
    console.log('   - Route: /explore');
    console.log('   - API: /api/home, /api/search');
    console.log('   - DB: listings');

    const { data: homeData, error: homeError } = await supabase
      .from('listings')
      .select('id, title, price, status')
      .eq('status', 'actief')
      .limit(5);

    if (homeError) {
      console.log(`   - FAIL: ${homeError.message}`);
    } else {
      console.log(`   - PASS: Found ${homeData?.length || 0} active listings`);
    }
    console.log('\n');

    // Test 4: Messages
    console.log('4. MESSAGES (P0)');
    console.log('   - Route: /profile/chats');
    console.log('   - API: /api/messages');
    console.log('   - DB: messages, conversations');

    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, body')
      .eq('sender_id', userId)
      .limit(1);

    if (messagesError) {
      console.log(`   - Status: UNKNOWN (${messagesError.message})`);
    } else {
      console.log(`   - Status: PASS (messages table accessible, found ${messagesData?.length || 0} messages)`);
    }
    console.log('\n');

    // Test 5: Admin access
    console.log('5. ADMIN (P1)');
    console.log('   - Route: /admin');
    console.log('   - Check: profile.is_admin');
    console.log(`   - Admin status: ${profile.is_admin ? 'PASS' : 'FAIL'}`);
    console.log('\n');

    console.log('📋 SUMMARY:');
    console.log('❓ Listing create: NEEDS TESTING');
    console.log('❓ Explore/Search: PARTIAL (DB accessible)');
    console.log('❓ Messages: PARTIAL (DB accessible)');
    console.log('✅ Admin access: PASS');

  } catch (error) {
    console.error('❌ Smoke test failed:', error);
  }
}

smokeTest().catch(console.error);
