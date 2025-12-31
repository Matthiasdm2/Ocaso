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

// Define brand lists per category (max 25 each)
const VEHICLE_BRANDS = {
  'auto-motor': [
    // Auto merken (20)
    'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Toyota', 'Honda', 'Ford', 'Nissan',
    'Peugeot', 'Renault', 'Opel', 'Citroën', 'Fiat', 'Skoda', 'Volvo', 'Hyundai',
    'Kia', 'Mazda', 'SEAT', 'Alfa Romeo',
    // Motor merken (5)
    'Yamaha', 'Kawasaki', 'Suzuki', 'Ducati', 'Aprilia'
  ],
  'bedrijfswagens': [
    'Mercedes-Benz Sprinter', 'Ford Transit', 'Volkswagen Crafter', 'Renault Master',
    'Peugeot Boxer', 'Citroën Jumper', 'Fiat Ducato', 'Iveco Daily', 'MAN TGE',
    'Scania R-Series', 'Volvo FH', 'DAF XF', 'Isuzu D-Max', 'Mitsubishi L200',
    'Nissan Navara', 'Vauxhall Movano', 'Toyota Hiace', 'Hyundai H350', 'Mercedes Atego',
    'Volvo FL', 'Renault Midlum', 'Iveco Eurocargo', 'MAN TGL', 'Scania P-Series', 'DAF LF'
  ],
  'camper-mobilhomes': [
    'Hymer', 'Knaus', 'Dethleffs', 'Adria', 'Bürstner', 'Pilote', 'Rapido',
    'Carthago', 'Hobby', 'Elnagh', 'Rimor', 'Roller Team', 'Benimar', 'Chausson',
    'Challenger', 'Autostar', 'Font Vendôme', 'McLouis', 'Sunlight', 'Weinsberg',
    'Laika', 'Mobilvetta', 'Trigano', 'Swift', 'Elddis'
  ]
};

function createSlug(name) {
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[ß]/g, 'ss')
    .replace(/[ü]/g, 'ue')
    .replace(/[ö]/g, 'oe')
    .replace(/[ä]/g, 'ae')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function populateVehicleBrands() {
  console.log('🚗 POPULATING VEHICLE BRANDS AS SUBCATEGORIES');
  console.log('==============================================');
  
  try {
    // Get vehicle categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'])
      .eq('is_active', true);
    
    if (catError) {
      console.error('❌ Categories fetch failed:', catError);
      return;
    }
    
    console.log('Vehicle categories:');
    categories.forEach(cat => {
      console.log(`  ${cat.id} | ${cat.name} | ${cat.slug}`);
    });
    
    // Clear existing subcategories first
    console.log('\n🧹 Clearing existing subcategories...');
    for (const category of categories) {
      const { error: deleteError } = await supabase
        .from('subcategories')
        .delete()
        .eq('category_id', category.id);
      
      if (deleteError) {
        console.log(`❌ Clear failed for ${category.name}:`, deleteError.message);
      } else {
        console.log(`✅ Cleared ${category.name}`);
      }
    }
    
    // Add brands as subcategories
    console.log('\n🏭 Adding vehicle brands as subcategories...');
    
    for (const category of categories) {
      const brandNames = VEHICLE_BRANDS[category.slug] || [];
      
      console.log(`\n${category.name}: adding ${brandNames.length} brands`);
      
      const subcategories = brandNames.map((brandName, index) => ({
        name: brandName,
        slug: createSlug(brandName),
        category_id: category.id,
        sort_order: index + 1
      }));
      
      // Insert in batches to avoid conflicts
      for (let i = 0; i < subcategories.length; i += 10) {
        const batch = subcategories.slice(i, i + 10);
        
        const { error: insertError } = await supabase
          .from('subcategories')
          .insert(batch);
        
        if (insertError) {
          console.error(`❌ Batch ${i/10 + 1} failed for ${category.name}:`, insertError.message);
          // Try individual inserts for debugging
          for (const subcat of batch) {
            const { error: singleError } = await supabase
              .from('subcategories')
              .insert(subcat);
            
            if (singleError) {
              console.error(`  ❌ ${subcat.name} (${subcat.slug}):`, singleError.message);
            } else {
              console.log(`  ✅ ${subcat.name}`);
            }
          }
        } else {
          console.log(`✅ Batch ${i/10 + 1} inserted (${batch.length} brands)`);
        }
      }
    }
    
    // Verify results
    console.log('\n📊 VERIFICATION:');
    for (const category of categories) {
      const { count } = await supabase
        .from('subcategories')
        .select('id', { count: 'exact' })
        .eq('category_id', category.id);
      
      console.log(`✅ ${category.name}: ${count} brands added`);
    }
    
    console.log('\n🎯 VEHICLE BRANDS POPULATION COMPLETE!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

populateVehicleBrands();
