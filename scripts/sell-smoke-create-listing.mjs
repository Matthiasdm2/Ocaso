#!/usr/bin/env node

/**
 * Sell Smoke Test - OCASO /SELL RELIABILITY
 * 
 * This script performs automated testing of the listing creation API
 * to validate end-to-end reliability and catch random failures.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateCorrelationId() {
  return "test-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function createTestListing(payload, description) {
  const requestId = generateCorrelationId();
  const startTime = Date.now();
  
  console.log(`🧪 ${description} (${requestId})`);
  
  try {
    const response = await fetch(`${supabaseUrl.replace('/supabase', '')}/api/listings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-ocaso-request-id': requestId
      },
      body: JSON.stringify({ ...payload, request_id: requestId }),
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Parse error' }));
      console.log(`   ❌ FAILED (${duration}ms): ${errorData.error}`);
      return { success: false, error: errorData.error, requestId, duration };
    }
    
    const result = await response.json();
    console.log(`   ✅ SUCCESS (${duration}ms): listing_id=${result.id}`);
    return { success: true, listingId: result.id, requestId, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ NETWORK ERROR (${duration}ms): ${error.message}`);
    return { success: false, error: error.message, requestId, duration };
  }
}

async function runSmokeTests() {
  console.log('🚀 SELL SMOKE TESTS - API RELIABILITY CHECK');
  console.log('===========================================\n');
  
  // First check if we can authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log('❌ Authentication required for testing');
    console.log('   Please sign in to run smoke tests');
    return false;
  }
  
  console.log(`👤 Authenticated as: ${user.email}`);
  console.log(`🆔 User ID: ${user.id}\n`);

  const results = [];
  let totalDuration = 0;
  
  // Test 1: Basic non-vehicle listing (5 iterations)
  console.log('📦 TEST SET 1: Non-vehicle listings (5x)');
  console.log('─'.repeat(45));
  
  for (let i = 1; i <= 5; i++) {
    const payload = {
      title: `Test Product ${i} - ${Date.now()}`,
      description: `Automated test listing ${i}`,
      price: 29.99 + i,
      category_id: 1, // Assuming category 1 is non-vehicle
      stock: 1,
      images: ['https://via.placeholder.com/400x300.jpg'],
      main_photo: 'https://via.placeholder.com/400x300.jpg',
      allow_offers: false,
      state: 'nieuw',
      status: 'actief'
    };
    
    const result = await createTestListing(payload, `Non-vehicle listing ${i}/5`);
    results.push(result);
    totalDuration += result.duration;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  
  // Test 2: Vehicle listings with details (5 iterations)  
  console.log('🚗 TEST SET 2: Vehicle listings with details (5x)');
  console.log('─'.repeat(50));
  
  // First get a vehicle category ID
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'])
    .limit(1);
  
  const vehicleCategoryId = categories?.[0]?.id || 3; // fallback to ID 3
  console.log(`   Using vehicle category ID: ${vehicleCategoryId}`);
  
  for (let i = 1; i <= 5; i++) {
    const payload = {
      title: `Test Vehicle ${i} - ${Date.now()}`,
      description: `Automated test vehicle listing ${i}`,
      price: 15000 + (i * 1000),
      category_id: vehicleCategoryId,
      stock: 1,
      images: ['https://via.placeholder.com/400x300.jpg'],
      main_photo: 'https://via.placeholder.com/400x300.jpg',
      allow_offers: true,
      state: 'gebruikt_goed',
      status: 'actief',
      vehicle_details: {
        year: 2015 + i,
        mileage_km: 50000 + (i * 10000),
        body_type: 'hatchback',
        condition: 'gebruikt_goed',
        fuel_type: 'benzine',
        power_hp: 100 + i * 10,
        transmission: 'manueel'
      }
    };
    
    const result = await createTestListing(payload, `Vehicle listing ${i}/5`);
    results.push(result);
    totalDuration += result.duration;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  
  // Results summary
  console.log('📊 SMOKE TEST RESULTS');
  console.log('=====================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📊 Success rate: ${(successful.length / results.length * 100).toFixed(1)}%`);
  console.log(`⏱️  Average duration: ${Math.round(totalDuration / results.length)}ms`);
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failed.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure.requestId}: ${failure.error}`);
    });
  }
  
  // Cleanup created test listings
  if (successful.length > 0) {
    console.log(`\n🧹 Cleaning up ${successful.length} test listings...`);
    for (const result of successful) {
      if (result.listingId) {
        await supabase
          .from('listings')
          .delete()
          .eq('id', result.listingId);
      }
    }
    console.log('✅ Cleanup completed');
  }
  
  return failed.length === 0;
}

// Run the smoke tests
runSmokeTests()
  .then((success) => {
    if (success) {
      console.log('\n🎉 ALL SMOKE TESTS PASSED - /sell API is reliable!');
      process.exit(0);
    } else {
      console.log('\n💥 SMOKE TESTS FAILED - /sell API has reliability issues!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Smoke test runner failed:', error);
    process.exit(1);
  });
