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

// FASE C: BRAND LISTS (MAX 25 PER CATEGORY)
const BRAND_MAPPINGS = {
  'auto-motor': [
    // Auto merken (20) + Motor merken (5)
    'audi', 'bmw', 'mercedes-benz', 'volkswagen', 'toyota', 'honda', 'ford', 'nissan',
    'peugeot', 'renault', 'opel', 'citroen', 'fiat', 'skoda', 'volvo', 'hyundai',
    'kia', 'mazda', 'seat', 'alfa-romeo',
    // Motor merken (5)
    'yamaha', 'honda', 'suzuki', 'kawasaki', 'aprilia'
  ],
  'bedrijfswagens': [
    // LCV/Van/Truck merken (25)
    'ford', 'mercedes-benz', 'volkswagen', 'renault', 'peugeot', 'citroen', 'fiat',
    'iveco', 'man', 'scania', 'volvo', 'daf', 'isuzu', 'mitsubishi', 'nissan',
    'opel', 'vauxhall', 'toyota', 'hyundai', 'maxus', 'ldv', 'crafter', 'sprinter',
    'transit', 'boxer'
  ],
  'camper-mobilhomes': [
    // Camper/Motorhome bouwers (25)
    'hymer', 'knaus', 'dethleffs', 'adria', 'buerstner', 'pilote', 'rapido',
    'carthago', 'hobby', 'elnagh', 'rimor', 'roller-team', 'benimar', 'chausson',
    'challenger', 'autostar', 'font-vendome', 'mclouis', 'sunlight', 'weinsberg',
    'laika', 'mobilvetta', 'trigano', 'swift', 'elddis'
  ]
};

async function setupVehicleBrandsMapping() {
  console.log('🚗 FASE C - BRAND MAPPINGS SETUP');
  console.log('================================');
  
  try {
    // Step 1: Get vehicle categories
    console.log('📁 Step 1: Getting vehicle categories...');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes']);
    
    if (catError) {
      console.error('❌ Categories fetch failed:', catError);
      return;
    }
    
    console.log('Found categories:');
    categories.forEach(cat => {
      console.log(`  ${cat.id} | ${cat.name} | ${cat.slug}`);
    });
    
    // Step 2: Create missing categories
    console.log('\n🔧 Step 2: Ensuring all 3 categories exist...');
    
    const slugsFound = categories.map(c => c.slug);
    const missingCats = ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'].filter(slug => !slugsFound.includes(slug));
    
    if (missingCats.includes('bedrijfswagens')) {
      console.log('Creating Bedrijfswagens category...');
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: 'Bedrijfswagens',
          slug: 'bedrijfswagens',
          sort_order: 9,
          is_active: true,
          icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/truck.svg'
        });
      
      if (insertError) console.error('❌ Insert Bedrijfswagens failed:', insertError);
      else console.log('✅ Bedrijfswagens created');
    }
    
    if (missingCats.includes('camper-mobilhomes')) {
      console.log('Creating Camper & Mobilhomes category...');
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: 'Camper & Mobilhomes',
          slug: 'camper-mobilhomes',
          sort_order: 10,
          is_active: true,
          icon_url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/caravan.svg'
        });
      
      if (insertError) console.error('❌ Insert Camper failed:', insertError);
      else console.log('✅ Camper & Mobilhomes created');
    }
    
    // Step 3: Get updated categories list
    const { data: allCategories, error: allCatError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes']);
    
    if (allCatError) {
      console.error('❌ Updated categories fetch failed:', allCatError);
      return;
    }
    
    console.log('\n✅ Final categories:');
    allCategories.forEach(cat => {
      console.log(`  ${cat.id} | ${cat.name} | ${cat.slug}`);
    });
    
    // Step 4: Get all vehicle brands
    console.log('\n📦 Step 3: Getting vehicle brands...');
    const { data: brands, error: brandsError } = await supabase
      .from('vehicle_brands')
      .select('id, name, slug')
      .order('name');
    
    if (brandsError) {
      console.error('❌ Brands fetch failed:', brandsError);
      return;
    }
    
    console.log(`Found ${brands.length} vehicle brands`);
    
    // Step 5: Create brand mappings
    console.log('\n🔗 Step 4: Creating brand mappings...');
    
    for (const category of allCategories) {
      const targetBrandSlugs = BRAND_MAPPINGS[category.slug] || [];
      console.log(`\n${category.name} (${category.slug}): targeting ${targetBrandSlugs.length} brands`);
      
      const mappedBrands = [];
      
      for (const brandSlug of targetBrandSlugs) {
        // Find brand by exact slug or fuzzy match
        let brand = brands.find(b => b.slug === brandSlug);
        
        if (!brand) {
          // Try fuzzy match
          brand = brands.find(b => 
            b.slug.includes(brandSlug) || 
            brandSlug.includes(b.slug) ||
            b.name.toLowerCase() === brandSlug.replace('-', ' ')
          );
        }
        
        if (brand && !mappedBrands.find(mb => mb.id === brand.id)) {
          mappedBrands.push(brand);
        }
      }
      
      console.log(`  Mapped ${mappedBrands.length} brands:`, mappedBrands.slice(0, 10).map(b => b.name).join(', '));
      
      // Insert mappings (upsert to avoid duplicates)
      if (mappedBrands.length > 0) {
        const mappings = mappedBrands.map(brand => ({
          category_id: category.id,
          vehicle_brand_id: brand.id
        }));
        
        // Clear existing mappings first
        await supabase
          .from('category_vehicle_brands')
          .delete()
          .eq('category_id', category.id);
        
        // Insert new mappings
        const { error: mapError } = await supabase
          .from('category_vehicle_brands')
          .insert(mappings);
        
        if (mapError) {
          console.error(`❌ Mapping failed for ${category.name}:`, mapError);
        } else {
          console.log(`✅ Created ${mappings.length} mappings for ${category.name}`);
        }
      }
    }
    
    console.log('\n🎯 BRAND MAPPINGS COMPLETE!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

setupVehicleBrandsMapping();
