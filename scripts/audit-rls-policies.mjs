#!/usr/bin/env node

/**
 * RLS Policies Audit Script - OCASO /SELL RELIABILITY
 * 
 * This script checks the Row Level Security policies for tables
 * used by the /sell flow to ensure proper access control.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function auditRlsPolicies() {
  console.log('🔐 RLS POLICIES AUDIT - /sell flow tables');
  console.log('==========================================\n');

  const tables = ['listings', 'listing_vehicle_details', 'listing_create_requests'];
  
  for (const table of tables) {
    console.log(`📋 Table: ${table}`);
    console.log('─'.repeat(50));
    
    try {
      // Test table access to see if RLS is working
      const { data: testData, error: testError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (testError) {
        if (testError.code === 'PGRST116' || testError.message.includes('row-level security')) {
          console.log('RLS Status: ✅ ENABLED (access denied without auth)');
        } else {
          console.log(`RLS Status: ❓ Unknown - ${testError.message}`);
        }
      } else {
        console.log('RLS Status: ❌ May be disabled (anonymous access allowed)');
        console.log(`  Retrieved ${testData?.length || 0} rows`);
      }
      
    } catch (error) {
      console.error(`❌ Error checking ${table}:`, error.message);
    }
    
    console.log('');
  }
  
  // Test authenticated access patterns with service role
  console.log('🧪 TESTING SERVICE ROLE ACCESS');
  console.log('===============================\n');
  
  try {
    // Test service role access to listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, status, seller_id')
      .limit(3);
      
    console.log(`Service role listings access: ${listingsError ? '❌' : '✅'}`);
    if (listingsError) {
      console.log(`  Error: ${listingsError.message}`);
    } else {
      console.log(`  Found ${listings?.length || 0} listings`);
    }
    
    // Test vehicle details access
    const { data: vehicleDetails, error: vehicleError } = await supabase
      .from('listing_vehicle_details')
      .select('id, listing_id')
      .limit(3);
      
    console.log(`Service role vehicle details access: ${vehicleError ? '❌' : '✅'}`);
    if (vehicleError) {
      console.log(`  Error: ${vehicleError.message}`);
    } else {
      console.log(`  Found ${vehicleDetails?.length || 0} vehicle detail records`);
    }
    
    // Test idempotency table
    const { data: requests, error: requestsError } = await supabase
      .from('listing_create_requests')
      .select('id, request_id, status')
      .limit(3);
      
    console.log(`Service role idempotency table access: ${requestsError ? '❌' : '✅'}`);
    if (requestsError) {
      console.log(`  Error: ${requestsError.message}`);
    } else {
      console.log(`  Found ${requests?.length || 0} request records`);
    }
    
  } catch (error) {
    console.error('❌ Service role test error:', error.message);
  }
}

// Run the audit
auditRlsPolicies()
  .then(() => {
    console.log('✅ RLS audit completed');
  })
  .catch((error) => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
