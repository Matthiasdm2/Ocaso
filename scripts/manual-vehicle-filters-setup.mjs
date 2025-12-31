#!/usr/bin/env node

/**
 * FASE C - MANUAL MIGRATION EXECUTION
 * Execute vehicle filters via individual queries
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
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 FASE C - MANUAL VEHICLE FILTERS SETUP');
console.log('========================================');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Step 1: Try to create the table with basic structure
console.log('Step 1: Attempting to create category_filters table...');

// Check if the table already exists by trying to select from it
let tableExists = false;
try {
  const { data, error } = await supabase.from('category_filters').select('count').limit(1);
  if (!error) {
    tableExists = true;
    console.log('✅ Table category_filters already exists');
  }
} catch (err) {
  console.log('ℹ️ Table does not exist, will create it');
}

if (!tableExists) {
  console.log('❌ Cannot create table directly via Supabase client');
  console.log('📋 Manual SQL needed in Supabase dashboard:');
  console.log('');
  console.log('-- Execute this in Supabase SQL Editor:');
  console.log(`
CREATE TABLE category_filters (
    id BIGSERIAL PRIMARY KEY,
    category_slug TEXT NOT NULL,
    filter_type TEXT NOT NULL DEFAULT 'vehicle',
    filter_key TEXT NOT NULL,
    filter_label TEXT NOT NULL,
    filter_options JSONB DEFAULT '[]',
    placeholder TEXT,
    input_type TEXT NOT NULL DEFAULT 'select',
    is_range BOOLEAN DEFAULT false,
    min_value NUMERIC,
    max_value NUMERIC,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX category_filters_unique_idx 
ON category_filters(category_slug, filter_key);

ALTER TABLE category_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_filters_read_policy" 
ON category_filters FOR SELECT 
USING (is_active = true);

CREATE POLICY "category_filters_write_policy" 
ON category_filters FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');
`);

  console.log('⚠️ Please run the above SQL manually, then re-run this script');
  process.exit(1);
}

// Step 2: Insert vehicle filters data via Supabase client
console.log('Step 2: Inserting vehicle filters data...');

const filterData = [
  // Auto & Motor filters
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'carrosserie', filter_label: 'Carrosserie type', filter_options: ["Sedan", "Hatchback", "SUV", "Stationwagon", "Coupé", "Cabriolet"], placeholder: 'Kies carrosserie', input_type: 'select', is_range: false, sort_order: 40 },
  
  // Bedrijfswagens filters  
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'carrosserie', filter_label: 'Type bedrijfswagen', filter_options: ["Bestelwagen", "Vrachtwagen", "Chassis cabine", "Kipper", "Bakwagen"], placeholder: 'Kies type', input_type: 'select', is_range: false, sort_order: 40 },
  
  // Camper & Mobilhomes filters
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'campertype', filter_label: 'Type camper', filter_options: ["Integraal", "Halfintegraal", "Alcoof", "Bus camper", "Vouwwagen", "Caravan"], placeholder: 'Kies camper type', input_type: 'select', is_range: false, sort_order: 40 }
];

try {
  const { error } = await supabase.from('category_filters').upsert(filterData, { 
    onConflict: 'category_slug,filter_key',
    ignoreDuplicates: false 
  });
  
  if (error) throw error;
  console.log(`✅ Inserted/updated ${filterData.length} filter configurations`);
} catch (err) {
  console.error('❌ Data insertion failed:', err.message);
  console.error('Full error:', err);
}

// Step 3: Verify data
console.log('Step 3: Verifying final setup...');

const vehicleSlugs = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'];

for (const slug of vehicleSlugs) {
  try {
    const { data, error, count } = await supabase
      .from('category_filters')
      .select('*', { count: 'exact' })
      .eq('category_slug', slug)
      .eq('is_active', true);
      
    if (error) throw error;
    
    console.log(`✅ ${slug}: ${count} filters configured`);
    if (data && data.length > 0) {
      console.log(`   Filters: ${data.map(f => f.filter_key).join(', ')}`);
    }
  } catch (err) {
    console.log(`❌ ${slug}: Verification failed - ${err.message}`);
  }
}

console.log('\n========================================');
console.log('🎯 SETUP COMPLETE! Test these URLs:');
console.log('  http://localhost:3000/api/categories/filters?category=auto-motor');
console.log('  http://localhost:3000/api/categories/filters?category=bedrijfswagens'); 
console.log('  http://localhost:3000/api/categories/filters?category=camper-mobilhomes');

process.exit(0);
