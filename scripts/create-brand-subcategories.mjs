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

async function createMappingTableDirectly() {
  console.log('🔧 CREATING CATEGORY_VEHICLE_BRANDS TABLE');
  console.log('========================================');
  
  try {
    // Alternative: use subcategories table to map brands per category
    console.log('📊 Alternative approach: Using subcategories for brand mapping...');
    
    // Get the 3 vehicle categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes']);
    
    if (catError) {
      console.error('❌ Categories fetch failed:', catError);
      return;
    }
    
    console.log('Vehicle categories:');
    categories.forEach(cat => {
      console.log(`  ${cat.id} | ${cat.name} | ${cat.slug}`);
    });
    
    // Clear existing subcategories for these categories
    console.log('\n🧹 Clearing existing vehicle subcategories...');
    for (const category of categories) {
      const { error: deleteError } = await supabase
        .from('subcategories')
        .delete()
        .eq('category_id', category.id);
      
      if (deleteError) {
        console.log(`❌ Clear failed for ${category.name}:`, deleteError);
      } else {
        console.log(`✅ Cleared ${category.name}`);
      }
    }
    
    // Get vehicle brands and create subcategories
    const { data: brands, error: brandsError } = await supabase
      .from('vehicle_brands')
      .select('id, name, slug, vehicle_type')
      .order('name');
    
    if (brandsError) {
      console.error('❌ Brands fetch failed:', brandsError);
      return;
    }
    
    console.log(`\n📦 Found ${brands.length} vehicle brands`);
    
    // Define brand-to-category mappings based on vehicle_type
    const brandMappings = {
      'auto-motor': brands.filter(b => 
        b.vehicle_type === 'car' || 
        b.vehicle_type === 'motorcycle'
      ).slice(0, 25),
      'bedrijfswagens': brands.filter(b => 
        b.vehicle_type === 'van' || 
        b.vehicle_type === 'truck'
      ).slice(0, 25),
      'camper-mobilhomes': brands.filter(b => 
        b.vehicle_type === 'motorhome' || 
        b.vehicle_type === 'caravan'
      ).slice(0, 25)
    };
    
    // Create subcategories for each category
    console.log('\n🔗 Creating brand subcategories...');
    
    for (const category of categories) {
      const categoryBrands = brandMappings[category.slug] || [];
      
      console.log(`\n${category.name}: ${categoryBrands.length} brands`);
      
      const subcategories = categoryBrands.map(brand => ({
        name: brand.name,
        slug: brand.slug,
        category_id: category.id,
        sort_order: 1
      }));
      
      if (subcategories.length > 0) {
        const { error: insertError } = await supabase
          .from('subcategories')
          .insert(subcategories);
        
        if (insertError) {
          console.error(`❌ Insert failed for ${category.name}:`, insertError);
        } else {
          console.log(`✅ Created ${subcategories.length} brand subcategories for ${category.name}`);
          console.log(`   Brands: ${categoryBrands.slice(0, 5).map(b => b.name).join(', ')}...`);
        }
      }
    }
    
    console.log('\n🎯 BRAND MAPPING VIA SUBCATEGORIES COMPLETE!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

createMappingTableDirectly();
