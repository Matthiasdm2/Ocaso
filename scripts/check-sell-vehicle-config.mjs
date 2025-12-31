#!/usr/bin/env node

/**
 * FASE B - SUPABASE CONFIG CHECK
 * Verify vehicle category configurations for /sell page
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 FASE B - SUPABASE CONFIG CHECK FOR /sell');
console.log('===========================================');

// Read environment 
const envPath = resolve(__dirname, '../.env.local');
const envContent = await readFile(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key] = value;
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Required vehicle filter keys for /sell
const REQUIRED_FILTER_KEYS = [
  'year',        // bouwjaar - numeric input
  'mileage_km',  // kilometerstand - numeric input  
  'body_type',   // carrosserie - select
  'condition',   // staat - select
  'fuel_type',   // brandstof - select
  'power_hp',    // vermogen - numeric input
  'transmission' // transmissie - select
];

const VEHICLE_CATEGORY_SLUGS = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'];

console.log('B1) Checking vehicle categories and their IDs...\n');

// Step 1: Get vehicle category IDs and verify slugs
const vehicleCategories = {};

for (const slug of VEHICLE_CATEGORY_SLUGS) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();
      
    if (error) {
      console.log(`❌ ${slug}: Error - ${error.message}`);
      continue;
    }
    
    if (!data) {
      console.log(`❌ ${slug}: Category not found`);
      continue;
    }
    
    vehicleCategories[slug] = data;
    console.log(`✅ ${slug}: ID=${data.id}, Name="${data.name}"`);
    
  } catch (err) {
    console.log(`❌ ${slug}: Exception - ${err.message}`);
  }
}

console.log('\nB2) Checking category_filters table and configurations...\n');

// Step 2: Check category_filters for each vehicle category
for (const slug of VEHICLE_CATEGORY_SLUGS) {
  if (!vehicleCategories[slug]) continue;
  
  console.log(`🔧 ${slug}:`);
  
  try {
    const { data: filters, error, count } = await supabase
      .from('category_filters')
      .select('*', { count: 'exact' })
      .eq('category_slug', slug)
      .eq('is_active', true);
      
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      continue;
    }
    
    if (!filters || filters.length === 0) {
      console.log(`   ⚠️ No active filters found`);
      continue;
    }
    
    console.log(`   ✅ ${count} filters configured`);
    
    // Check for required filter keys
    const foundKeys = filters.map(f => f.filter_key);
    const missingKeys = REQUIRED_FILTER_KEYS.filter(key => !foundKeys.includes(key));
    
    if (missingKeys.length > 0) {
      console.log(`   ⚠️ Missing keys: ${missingKeys.join(', ')}`);
    } else {
      console.log(`   ✅ All required filter keys present`);
    }
    
    // Show current filter keys
    console.log(`   📋 Current keys: ${foundKeys.join(', ')}`);
    
    // Check select options for select-type filters
    const selectFilters = filters.filter(f => f.input_type === 'select' && !f.is_range);
    for (const filter of selectFilters) {
      const optionsCount = Array.isArray(filter.filter_options) ? filter.filter_options.length : 0;
      console.log(`      ${filter.filter_key}: ${optionsCount} options`);
    }
    
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  console.log('');
}

console.log('===========================================');
console.log('Summary:');
console.log(`Vehicle categories found: ${Object.keys(vehicleCategories).length}/${VEHICLE_CATEGORY_SLUGS.length}`);
console.log(`Required filter keys: ${REQUIRED_FILTER_KEYS.length}`);

if (Object.keys(vehicleCategories).length < VEHICLE_CATEGORY_SLUGS.length) {
  console.log('\n❌ MISSING VEHICLE CATEGORIES - Migration may be needed');
  process.exit(1);
}

console.log('\n✅ Supabase config check complete');
process.exit(0);
