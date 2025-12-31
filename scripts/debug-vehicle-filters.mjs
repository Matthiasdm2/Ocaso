#!/usr/bin/env node

/**
 * FASE A - ROOT CAUSE ANALYSE SCRIPT
 * Test vehicle filters API direct via Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

console.log('🔍 FASE A - ROOT CAUSE ANALYSE');
console.log('================================');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Key length: ${supabaseKey?.length || 0}`);

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\nA3) Checking category_filters table...');

// Test 1: Check if table exists and has data
try {
  const { data, error, count } = await supabase
    .from('category_filters')
    .select('category_slug, filter_key', { count: 'exact' })
    .limit(5);
    
  if (error) {
    console.error('❌ Table query error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details);
  } else {
    console.log(`✅ Table exists with ${count} total rows`);
    console.log('   Sample data:', data);
  }
} catch (err) {
  console.error('❌ Connection error:', err.message);
}

console.log('\nA3.1) Checking for vehicle category slugs...');

// Test 2: Check specific vehicle categories
const vehicleSlugs = ['auto-motor', 'bedrijfswagens', 'motoren', 'camper-mobilhomes'];

for (const slug of vehicleSlugs) {
  try {
    const { data, error, count } = await supabase
      .from('category_filters')
      .select('*', { count: 'exact' })
      .eq('category_slug', slug)
      .eq('is_active', true);
      
    if (error) {
      console.log(`❌ ${slug}: Error - ${error.message}`);
    } else {
      console.log(`${count > 0 ? '✅' : '⚠️'} ${slug}: ${count} filters found`);
      if (data && data.length > 0) {
        console.log(`    Filters: ${data.map(f => f.filter_key).join(', ')}`);
      }
    }
  } catch (err) {
    console.log(`❌ ${slug}: Exception - ${err.message}`);
  }
}

console.log('\nA4) Checking RLS policies...');

// Test 3: Check RLS status 
try {
  const { data, error } = await supabase.rpc('has_table_privilege', {
    schema_name: 'public',
    table_name: 'category_filters',
    privilege: 'SELECT'
  });
  
  if (error) {
    console.log('⚠️ Cannot check RLS privilege:', error.message);
  } else {
    console.log('✅ SELECT privilege check:', data);
  }
} catch (err) {
  console.log('⚠️ RLS check not available');
}

console.log('\n================================');
console.log('Root cause analysis complete!');

process.exit(0);
