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

// CANONICAL VEHICLE BRANDS DATA
const VEHICLE_BRANDS = {
  'auto-motor': [
    'Abarth', 'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Citroën', 'Cupra', 'Dacia',
    'DS Automobiles', 'Fiat', 'Ford', 'Genesis', 'Honda', 'Hyundai', 'Jaguar',
    'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lynk & Co', 'Mazda', 'Mercedes-Benz',
    'MG', 'MINI', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Polestar',
    'Porsche', 'Renault', 'SEAT', 'Škoda', 'Smart', 'Subaru', 'Suzuki',
    'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Aiways', 'Leapmotor', 'NIO',
    'Ora', 'XPeng'
  ],
  'bedrijfswagens': [
    'BYD Commercial', 'Citroën Professional', 'DAF', 'Fiat Professional',
    'Ford Commercial', 'Hyundai Commercial', 'Isuzu', 'Iveco', 'MAN', 'Maxus',
    'Mercedes-Benz Commercial', 'Mitsubishi Fuso', 'Nissan Commercial',
    'Opel Commercial', 'Peugeot Professional', 'Piaggio Commercial', 'RAM',
    'Renault Commercial', 'Scania', 'SsangYong', 'Tata', 'Toyota Commercial',
    'Volkswagen Commercial', 'Volvo Trucks', 'Vauxhall'
  ],
  'motoren': [
    'Aprilia', 'Benelli', 'BMW Motorrad', 'CFMOTO', 'Ducati', 'GasGas',
    'Harley-Davidson', 'Honda Motorcycles', 'Husqvarna', 'Indian', 'Kawasaki',
    'KTM', 'Kymco', 'Moto Guzzi', 'MV Agusta', 'Peugeot Motocycles',
    'Piaggio Motorcycles', 'Royal Enfield', 'Suzuki Motorcycles', 'Sym',
    'Triumph', 'Vespa', 'Yamaha', 'Zero Motorcycles', 'Zontes'
  ],
  'camper-mobilhomes': [
    'Adria', 'Bailey', 'Bürstner', 'Carado', 'Carthago', 'Challenger',
    'Dethleffs', 'Elddis', 'Fendt', 'Hobby', 'Hymer', 'Knaus', 'Laika',
    'Lunar', 'McLouis', 'Pilote', 'Rapido', 'Roller Team', 'Sunlight',
    'Swift', 'Tabbert', 'Trigano', 'Weinsberg', 'Westfalia', 'XGO'
  ]
};

function createSlug(name) {
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[ß]/g, 'ss')
    .replace(/[ü]/g, 'ue')
    .replace(/[ö]/g, 'oe')
    .replace(/[ä]/g, 'ae')
    .replace(/[š]/g, 's')
    .replace(/[ć]/g, 'c')
    .replace(/[&]/g, '-')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function setupCanonicalVehicleCategories() {
  console.log('🚗 SETTING UP CANONICAL VEHICLE CATEGORIES');
  console.log('==========================================');
  
  try {
    // Step 1: Ensure 4 categories exist
    console.log('📁 Step 1: Setting up vehicle categories...');
    
    const categoryData = [
      { name: 'Auto & Motor', slug: 'auto-motor', sort_order: 3, icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/car.svg' },
      { name: 'Bedrijfswagens', slug: 'bedrijfswagens', sort_order: 9, icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/truck.svg' },
      { name: 'Camper & Mobilhomes', slug: 'camper-mobilhomes', sort_order: 10, icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/caravan.svg' },
      { name: 'Motoren', slug: 'motoren', sort_order: 11, icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/motorbike.svg' }
    ];
    
    for (const cat of categoryData) {
      const { error: upsertError } = await supabase
        .from('categories')
        .upsert({
          ...cat,
          is_active: true
        }, { 
          onConflict: 'slug',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        // Try update instead
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            name: cat.name,
            sort_order: cat.sort_order,
            is_active: true,
            icon_url: cat.icon_url
          })
          .eq('slug', cat.slug);
        
        if (updateError) {
          console.error(`❌ Category ${cat.name} failed:`, updateError);
        } else {
          console.log(`✅ Updated ${cat.name}`);
        }
      } else {
        console.log(`✅ Upserted ${cat.name}`);
      }
    }
    
    // Get final categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'motoren', 'camper-mobilhomes'])
      .eq('is_active', true);
    
    if (catError) {
      console.error('❌ Categories fetch failed:', catError);
      return;
    }
    
    console.log('Vehicle categories:');
    categories.forEach(cat => {
      console.log(`  ${cat.id} | ${cat.name} | ${cat.slug}`);
    });
    
    // Step 2: Clear existing subcategories for these categories
    console.log('\n🧹 Step 2: Clearing existing subcategories...');
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
    
    // Step 3: Add canonical brands as subcategories
    console.log('\n🏭 Step 3: Adding canonical vehicle brands...');
    
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
        } else {
          console.log(`✅ Batch ${i/10 + 1} inserted (${batch.length} brands)`);
        }
      }
    }
    
    // Step 4: Verification
    console.log('\n🔍 Step 4: Final verification...');
    for (const category of categories) {
      const { count } = await supabase
        .from('subcategories')
        .select('id', { count: 'exact' })
        .eq('category_id', category.id);
      
      const expectedCount = category.slug === 'auto-motor' ? 45 : 25;
      const status = count === expectedCount ? '✅' : '❌';
      console.log(`  ${status} ${category.name}: ${count}/${expectedCount} brands`);
    }
    
    console.log('\n🎯 CANONICAL VEHICLE CATEGORIES SETUP COMPLETE!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

setupCanonicalVehicleCategories();
