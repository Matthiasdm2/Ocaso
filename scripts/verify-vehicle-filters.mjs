#!/usr/bin/env node

/**
 * FASE E - VERIFICATIE SCRIPT
 * Verify vehicle filters are working for the 3 main categories
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 FASE E - VEHICLE FILTERS VERIFICATION');
console.log('========================================');

// Read environment 
const envPath = resolve(__dirname, '../.env.local');
const envContent = await readFile(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key] = value;
});

const API_BASE = 'http://localhost:3000';
const REQUIRED_VEHICLE_SLUGS = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'];

let allPassed = true;

console.log('Testing API endpoints...\n');

for (const slug of REQUIRED_VEHICLE_SLUGS) {
  const url = `${API_BASE}/api/categories/filters?category=${slug}`;
  console.log(`🧪 Testing: ${slug}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}: ${data.error || 'Unknown error'}`);
      allPassed = false;
      continue;
    }
    
    if (!data.filters || !Array.isArray(data.filters)) {
      console.log(`   ❌ No filters array in response`);
      allPassed = false;
      continue;
    }
    
    if (data.filters.length === 0) {
      console.log(`   ❌ Empty filters array - this should not happen for vehicle categories`);
      allPassed = false;
      continue;
    }
    
    console.log(`   ✅ ${data.filters.length} filters found`);
    console.log(`   📋 Filter keys: ${data.filters.map(f => f.filter_key).join(', ')}`);
    
    // Check required filter types for vehicles
    const hasYearFilter = data.filters.some(f => f.filter_key === 'bouwjaar');
    const hasMileageFilter = data.filters.some(f => f.filter_key === 'kilometerstand');
    const hasFuelFilter = data.filters.some(f => f.filter_key === 'brandstof');
    
    if (!hasYearFilter || !hasMileageFilter || !hasFuelFilter) {
      console.log(`   ⚠️ Missing essential vehicle filters (year/mileage/fuel)`);
    }
    
  } catch (err) {
    console.log(`   ❌ Request failed: ${err.message}`);
    allPassed = false;
  }
  
  console.log('');
}

console.log('========================================');

if (allPassed) {
  console.log('🎯 ✅ ALL TESTS PASSED!');
  console.log('Vehicle filters are working correctly for all categories.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test in browser: /marketplace?category=auto-motor');
  console.log('2. Verify filters appear in UI');
  console.log('3. Deploy to staging/production');
  
  process.exit(0);
} else {
  console.log('❌ TESTS FAILED!');
  console.log('Some vehicle categories do not return filters.');
  console.log('Please check server logs and API implementation.');
  
  process.exit(1);
}
