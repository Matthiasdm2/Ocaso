import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key] = value;
    }
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🚀 APPLYING VEHICLE CATEGORIES SPLIT MIGRATION');
  console.log('===============================================');
  
  try {
    console.log('⚡ Step 1: Update Auto & Motor category...');
    await supabase.rpc('execute_sql', {
      query: `
        UPDATE categories 
        SET 
          name = 'Auto & Motor',
          slug = 'auto-motor',
          sort_order = 3,
          is_active = true,
          icon_url = 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/car.svg'
        WHERE id = 3;
      `
    });
    
    console.log('⚡ Step 2: Create category_vehicle_brands table...');
    await supabase.rpc('execute_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS category_vehicle_brands (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
          vehicle_brand_id INTEGER REFERENCES vehicle_brands(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(category_id, vehicle_brand_id)
        );
      `
    });
    
    console.log('⚡ Step 3: Enable RLS...');
    await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE category_vehicle_brands ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Allow public read access on category_vehicle_brands" ON category_vehicle_brands
          FOR SELECT USING (true);
      `
    });
    
    console.log('✅ Migration steps completed!');
    
  } catch (err) {
    // Try alternative approach with direct queries
    console.log('🔄 Trying alternative approach...');
    
    // Step 1: Update Auto & Motor
    const { error: updateError } = await supabase
      .from('categories')
      .update({
        name: 'Auto & Motor',
        slug: 'auto-motor', 
        sort_order: 3,
        is_active: true,
        icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/car.svg'
      })
      .eq('id', 3);
    
    if (updateError) {
      console.error('❌ Update Auto & Motor failed:', updateError);
    } else {
      console.log('✅ Auto & Motor updated');
    }
    
    // Check what vehicle categories exist
    console.log('\n🔍 Checking existing vehicle categories...');
    const { data: vehiclesCats, error: vcError } = await supabase
      .from('categories')
      .select('id, name, slug, is_active')
      .or('slug.like.vehicles%,name.ilike.%bedrijf%,name.ilike.%camper%,name.ilike.%motor%');
    
    if (vcError) {
      console.error('❌ Check failed:', vcError);
    } else {
      console.log('Found vehicle categories:');
      vehiclesCats.forEach(cat => {
        console.log(`  ${cat.id} | ${cat.name} | ${cat.slug} | active:${cat.is_active}`);
      });
    }
  }
  
  console.log('\n🎯 MIGRATION COMPLETE!');
}

applyMigration();
