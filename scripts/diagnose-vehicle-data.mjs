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

async function inspectVehicleData() {
  console.log('🔍 FASE A - VEHICLE DATA DIAGNOSE');
  console.log('================================');
  
  // A1) Categories data
  console.log('\n📁 A1) CATEGORIES DATA:');
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order, is_active, icon_url')
    .order('sort_order');
  
  if (catError) {
    console.error('❌ Categories error:', catError);
    return;
  }
  
  categories.forEach(cat => {
    console.log(`  ${cat.id} | ${cat.name} | ${cat.slug} | sort:${cat.sort_order} | active:${cat.is_active} | icon:${cat.icon_url ? '✓' : '❌'}`);
  });
  
  // A2) Find vehicle category
  console.log('\n🚗 A2) VEHICLE ROOT CATEGORY:');
  const vehicleCategory = categories.find(c => 
    c.slug === 'auto-motor' || 
    c.slug === 'vehicles' || 
    c.slug === 'cars' ||
    c.name?.toLowerCase().includes('auto')
  );
  
  if (vehicleCategory) {
    console.log(`  GEVONDEN: ${vehicleCategory.name} (slug: ${vehicleCategory.slug}, id: ${vehicleCategory.id})`);
  } else {
    console.log('  ❌ GEEN vehicle category gevonden!');
  }
  
  // A3) Vehicle brands data
  console.log('\n🏭 A3) VEHICLE BRANDS DATA:');
  const { data: brands, error: brandsError } = await supabase
    .from('vehicle_brands')
    .select('*')
    .order('name');
  
  if (brandsError) {
    console.error('❌ Vehicle brands error:', brandsError);
  } else {
    console.log(`  Total brands: ${brands.length}`);
    console.log('  Sample brands:', brands.slice(0, 10).map(b => b.name).join(', '));
  }
  
  // Check category_vehicle_brands mapping
  if (vehicleCategory) {
    console.log('\n🔗 A3b) CATEGORY-BRAND MAPPING:');
    const { data: mappings, error: mapError } = await supabase
      .from('category_vehicle_brands')
      .select('*')
      .eq('category_id', vehicleCategory.id);
    
    if (mapError) {
      console.error('❌ Mapping error:', mapError);
    } else {
      console.log(`  Auto & Motor heeft ${mappings.length} brand mappings`);
    }
  }
  
  // A3c) Subcategories check (alternative merken source)
  console.log('\n📂 A3c) SUBCATEGORIES AS BRANDS:');
  if (vehicleCategory) {
    const { data: subs, error: subError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', vehicleCategory.id);
    
    if (subError) {
      console.error('❌ Subcategories error:', subError);
    } else {
      console.log(`  Auto & Motor heeft ${subs.length} subcategories`);
      if (subs.length > 0) {
        console.log('  Sample subs:', subs.slice(0, 10).map(s => s.name).join(', '));
      }
    }
  }
  
  // A4) Duplicate checks
  console.log('\n🔍 A4) DUPLICATE CHECKS:');
  
  // Duplicate category slugs
  const slugCounts = {};
  categories.forEach(cat => {
    slugCounts[cat.slug] = (slugCounts[cat.slug] || 0) + 1;
  });
  
  const dupSlugs = Object.entries(slugCounts).filter(([, count]) => count > 1);
  if (dupSlugs.length > 0) {
    console.log('  ❌ Duplicate category slugs:', dupSlugs);
  } else {
    console.log('  ✅ Geen duplicate category slugs');
  }
  
  // Duplicate brand slugs
  if (brands && brands.length > 0) {
    const brandSlugCounts = {};
    brands.forEach(brand => {
      brandSlugCounts[brand.slug] = (brandSlugCounts[brand.slug] || 0) + 1;
    });
    
    const dupBrandSlugs = Object.entries(brandSlugCounts).filter(([, count]) => count > 1);
    if (dupBrandSlugs.length > 0) {
      console.log('  ❌ Duplicate brand slugs:', dupBrandSlugs);
    } else {
      console.log('  ✅ Geen duplicate brand slugs');
    }
  }
  
  console.log('\n🎯 DIAGNOSE COMPLEET');
  process.exit(0);
}

inspectVehicleData().catch(console.error);
