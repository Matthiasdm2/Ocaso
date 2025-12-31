#!/usr/bin/env node

/**
 * Execute /sell vehicle filters migration manually
 * Creates category_filters table with required configurations
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 EXECUTING SELL VEHICLE FILTERS MIGRATION');
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
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Check if table exists first
console.log('Step 1: Checking if category_filters table exists...');

try {
  const { data, error } = await supabase.from('category_filters').select('count').limit(1);
  
  if (!error) {
    console.log('✅ Table already exists, proceeding with UPSERT data...');
  }
} catch (err) {
  console.log('ℹ️ Table does not exist, will create via data insertion');
}

// Step 2: Insert filter configurations using Supabase client
console.log('Step 2: Upserting vehicle filter configurations...');

const vehicleFilters = [
  // AUTO & MOTOR filters
  { category_slug: 'auto-motor', filter_key: 'year', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Bijv. 2018', input_type: 'number', is_range: false, sort_order: 10 },
  { category_slug: 'auto-motor', filter_key: 'mileage_km', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Bijv. 85000', input_type: 'number', is_range: false, sort_order: 20 },
  { category_slug: 'auto-motor', filter_key: 'body_type', filter_label: 'Carrosserie', filter_options: ["Sedan", "Hatchback", "SUV", "Stationwagon", "Coupé", "Cabriolet", "MPV", "Pick-up"], placeholder: 'Kies carrosserie type', input_type: 'select', is_range: false, sort_order: 30 },
  { category_slug: 'auto-motor', filter_key: 'condition', filter_label: 'Staat', filter_options: ["Nieuw", "Zo goed als nieuw", "Gebruikt", "Opknapper"], placeholder: 'Kies staat', input_type: 'select', is_range: false, sort_order: 40 },
  { category_slug: 'auto-motor', filter_key: 'fuel_type', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof type', input_type: 'select', is_range: false, sort_order: 50 },
  { category_slug: 'auto-motor', filter_key: 'power_hp', filter_label: 'Vermogen (pk)', filter_options: [], placeholder: 'Bijv. 150', input_type: 'number', is_range: false, sort_order: 60 },
  { category_slug: 'auto-motor', filter_key: 'transmission', filter_label: 'Transmissie', filter_options: ["Handgeschakeld", "Automaat", "Semi-automaat"], placeholder: 'Kies transmissie', input_type: 'select', is_range: false, sort_order: 70 },

  // BEDRIJFSWAGENS filters
  { category_slug: 'bedrijfswagens', filter_key: 'year', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Bijv. 2019', input_type: 'number', is_range: false, sort_order: 10 },
  { category_slug: 'bedrijfswagens', filter_key: 'mileage_km', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Bijv. 120000', input_type: 'number', is_range: false, sort_order: 20 },
  { category_slug: 'bedrijfswagens', filter_key: 'body_type', filter_label: 'Type bedrijfswagen', filter_options: ["Bestelwagen", "Vrachtwagen", "Chassis cabine", "Kipper", "Bakwagen", "Koelwagen", "Kraanwagen"], placeholder: 'Kies type', input_type: 'select', is_range: false, sort_order: 30 },
  { category_slug: 'bedrijfswagens', filter_key: 'condition', filter_label: 'Staat', filter_options: ["Nieuw", "Zo goed als nieuw", "Gebruikt", "Opknapper"], placeholder: 'Kies staat', input_type: 'select', is_range: false, sort_order: 40 },
  { category_slug: 'bedrijfswagens', filter_key: 'fuel_type', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof type', input_type: 'select', is_range: false, sort_order: 50 },
  { category_slug: 'bedrijfswagens', filter_key: 'power_hp', filter_label: 'Vermogen (pk)', filter_options: [], placeholder: 'Bijv. 180', input_type: 'number', is_range: false, sort_order: 60 },
  { category_slug: 'bedrijfswagens', filter_key: 'transmission', filter_label: 'Transmissie', filter_options: ["Handgeschakeld", "Automaat", "Semi-automaat"], placeholder: 'Kies transmissie', input_type: 'select', is_range: false, sort_order: 70 },

  // CAMPER & MOBILHOMES filters
  { category_slug: 'camper-mobilhomes', filter_key: 'year', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Bijv. 2017', input_type: 'number', is_range: false, sort_order: 10 },
  { category_slug: 'camper-mobilhomes', filter_key: 'mileage_km', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Bijv. 95000', input_type: 'number', is_range: false, sort_order: 20 },
  { category_slug: 'camper-mobilhomes', filter_key: 'body_type', filter_label: 'Type camper', filter_options: ["Integraal", "Halfintegraal", "Alcoof", "Bus camper", "Vouwwagen", "Caravan", "Mobilhome"], placeholder: 'Kies camper type', input_type: 'select', is_range: false, sort_order: 30 },
  { category_slug: 'camper-mobilhomes', filter_key: 'condition', filter_label: 'Staat', filter_options: ["Nieuw", "Zo goed als nieuw", "Gebruikt", "Opknapper"], placeholder: 'Kies staat', input_type: 'select', is_range: false, sort_order: 40 },
  { category_slug: 'camper-mobilhomes', filter_key: 'fuel_type', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof type', input_type: 'select', is_range: false, sort_order: 50 },
  { category_slug: 'camper-mobilhomes', filter_key: 'power_hp', filter_label: 'Vermogen (pk)', filter_options: [], placeholder: 'Bijv. 130', input_type: 'number', is_range: false, sort_order: 60 },
  { category_slug: 'camper-mobilhomes', filter_key: 'transmission', filter_label: 'Transmissie', filter_options: ["Handgeschakeld", "Automaat", "Semi-automaat"], placeholder: 'Kies transmissie', input_type: 'select', is_range: false, sort_order: 70 }
];

try {
  // Use upsert with onConflict to handle updates
  const { error } = await supabase
    .from('category_filters')
    .upsert(vehicleFilters, { 
      onConflict: 'category_slug,filter_key',
      ignoreDuplicates: false 
    });

  if (error) {
    throw error;
  }

  console.log(`✅ Successfully upserted ${vehicleFilters.length} vehicle filter configurations`);

} catch (err) {
  console.error(`❌ Failed to upsert filter data: ${err.message}`);
  
  if (err.message.includes('table') && err.message.includes('does not exist')) {
    console.log('\n📋 MANUAL SQL REQUIRED:');
    console.log('Please execute the SQL in supabase/migrations/20241231140000_sell_vehicle_filters.sql');
    console.log('via the Supabase Dashboard SQL Editor, then re-run this script.');
  }
  
  process.exit(1);
}

// Step 3: Verify the data
console.log('Step 3: Verifying filter configurations...');

const slugs = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'];

for (const slug of slugs) {
  try {
    const { data, error, count } = await supabase
      .from('category_filters')
      .select('filter_key', { count: 'exact' })
      .eq('category_slug', slug)
      .eq('is_active', true);
      
    if (error) throw error;
    
    console.log(`✅ ${slug}: ${count} filters configured`);
    console.log(`   Keys: ${data.map(f => f.filter_key).join(', ')}`);
    
  } catch (err) {
    console.log(`❌ ${slug}: Verification failed - ${err.message}`);
  }
}

console.log('\n===========================================');
console.log('🎯 MIGRATION COMPLETE!');
console.log('Vehicle filter configurations ready for /sell page');

process.exit(0);
