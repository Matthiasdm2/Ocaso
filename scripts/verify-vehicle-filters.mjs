#!/usr/bin/env node

/**
 * Verify Vehicle Filters - OCASO VEHICLE DETAILS PERSISTENCE
 * 
 * This script verifies that the category_filters table has been properly
 * created and seeded with the required vehicle filter configurations.
 * 
 * Expected:
 * - 3 vehicle category slugs: auto-motor, bedrijfswagens, camper-mobilhomes
 * - 7 filters per category: year, mileage_km, body_type, condition, fuel_type, power_hp, transmission
 * - Total: 21 filter records
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
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const REQUIRED_CATEGORIES = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'];
const REQUIRED_FILTERS = ['year', 'mileage_km', 'body_type', 'condition', 'fuel_type', 'power_hp', 'transmission'];

async function verifyVehicleFilters() {
  console.log('🔍 Verifying vehicle filters configuration...\n');

  try {
    // Check if category_filters table exists and is accessible
    console.log('1. Checking category_filters table access...');
    const { data: filters, error } = await supabase
      .from('category_filters')
      .select('category_slug, filter_key, filter_type, label')
      .order('category_slug, display_order');

    if (error) {
      console.error('❌ Failed to access category_filters table:', error.message);
      return false;
    }

    if (!filters || filters.length === 0) {
      console.error('❌ category_filters table is empty');
      return false;
    }

    console.log(`✓ Found ${filters.length} filter records`);

    // Group filters by category
    const filtersByCategory = filters.reduce((acc, filter) => {
      if (!acc[filter.category_slug]) acc[filter.category_slug] = [];
      acc[filter.category_slug].push(filter);
      return acc;
    }, {});

    console.log('\n2. Verifying vehicle categories...');
    
    let allCategoriesValid = true;
    for (const requiredCategory of REQUIRED_CATEGORIES) {
      if (!filtersByCategory[requiredCategory]) {
        console.error(`❌ Missing category: ${requiredCategory}`);
        allCategoriesValid = false;
        continue;
      }

      const categoryFilters = filtersByCategory[requiredCategory];
      console.log(`✓ ${requiredCategory}: ${categoryFilters.length} filters`);

      // Check required filter keys
      const filterKeys = categoryFilters.map(f => f.filter_key);
      const missingFilters = REQUIRED_FILTERS.filter(rf => !filterKeys.includes(rf));
      
      if (missingFilters.length > 0) {
        console.error(`❌ ${requiredCategory} missing filters: ${missingFilters.join(', ')}`);
        allCategoriesValid = false;
      } else {
        console.log(`  ✓ All 7 required filters present`);
      }
    }

    if (!allCategoriesValid) {
      return false;
    }

    console.log('\n3. Checking filter data quality...');
    
    // Check for required fields and data types
    let dataQualityIssues = 0;
    for (const filter of filters) {
      if (!filter.filter_key || !filter.filter_type || !filter.label) {
        console.error(`❌ Invalid filter record: ${JSON.stringify(filter)}`);
        dataQualityIssues++;
      }
    }

    if (dataQualityIssues > 0) {
      console.error(`❌ Found ${dataQualityIssues} data quality issues`);
      return false;
    }

    console.log('✓ All filter records have required fields');

    // Check category coverage
    console.log('\n4. Summary:');
    console.log(`✓ Categories: ${Object.keys(filtersByCategory).length}/3`);
    console.log(`✓ Total filters: ${filters.length}/21`);
    console.log('✓ Vehicle filters verification PASSED\n');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error during verification:', error.message);
    return false;
  }
}

// Run verification
verifyVehicleFilters()
  .then(success => {
    if (success) {
      console.log('🎉 Vehicle filters verification completed successfully!');
      process.exit(0);
    } else {
      console.error('💥 Vehicle filters verification FAILED!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Script error:', error);
    process.exit(1);
  });
