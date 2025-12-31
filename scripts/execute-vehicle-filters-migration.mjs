#!/usr/bin/env node

/**
 * FASE C - FORCE MIGRATION EXECUTION
 * Execute vehicle filters migration directly via Supabase
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
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY; // Use service role for DDL

console.log('🚀 FASE C - EXECUTING VEHICLE FILTERS MIGRATION');
console.log('===============================================');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Step 1: Create table (idempotent)
const createTableSQL = `
-- Create category filters table if not exists
CREATE TABLE IF NOT EXISTS category_filters (
    id BIGSERIAL PRIMARY KEY,
    category_slug TEXT NOT NULL,
    filter_type TEXT NOT NULL,
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

-- Create unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_filters_unique_idx') THEN
        CREATE UNIQUE INDEX category_filters_unique_idx 
        ON category_filters(category_slug, filter_key);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE category_filters ENABLE ROW LEVEL SECURITY;

-- Create policies (idempotent)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "category_filters_read_policy" ON category_filters;
    DROP POLICY IF EXISTS "category_filters_write_policy" ON category_filters;
    
    -- Create new policies
    CREATE POLICY "category_filters_read_policy" 
    ON category_filters FOR SELECT 
    USING (is_active = true);
    
    CREATE POLICY "category_filters_write_policy" 
    ON category_filters FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');
END $$;
`;

console.log('Step 1: Creating table structure...');

try {
  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  if (error) throw error;
  console.log('✅ Table structure created');
} catch (err) {
  console.error('❌ Table creation failed:', err.message);
  process.exit(1);
}

// Step 2: Insert vehicle filters data (UPSERT)
console.log('Step 2: Inserting vehicle filters data...');

const filterData = [
  // Auto & Motor filters
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
  { category_slug: 'auto-motor', filter_type: 'vehicle', filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
  
  // Bedrijfswagens filters  
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
  { category_slug: 'bedrijfswagens', filter_type: 'vehicle', filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 },
  
  // Camper & Mobilhomes filters
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'bouwjaar', filter_label: 'Bouwjaar', filter_options: [], placeholder: 'Kies bouwjaar', input_type: 'select', is_range: true, sort_order: 10 },
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'kilometerstand', filter_label: 'Kilometerstand', filter_options: [], placeholder: 'Kies kilometerstand', input_type: 'select', is_range: true, sort_order: 20 },
  { category_slug: 'camper-mobilhomes', filter_type: 'vehicle', filter_key: 'brandstof', filter_label: 'Brandstof', filter_options: ["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "CNG"], placeholder: 'Kies brandstof', input_type: 'select', is_range: false, sort_order: 30 }
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
}

// Step 3: Verify data
console.log('Step 3: Verifying data...');

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
    console.log(`   Filters: ${data.map(f => f.filter_key).join(', ')}`);
  } catch (err) {
    console.log(`❌ ${slug}: Verification failed - ${err.message}`);
  }
}

console.log('\n===============================================');
console.log('🎯 MIGRATION EXECUTION COMPLETE!');
console.log('Test URLs:');
console.log('  http://localhost:3000/api/categories/filters?category=auto-motor');
console.log('  http://localhost:3000/api/categories/filters?category=bedrijfswagens'); 
console.log('  http://localhost:3000/api/categories/filters?category=camper-mobilhomes');

process.exit(0);
