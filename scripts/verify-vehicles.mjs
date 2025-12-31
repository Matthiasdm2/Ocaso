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

async function verifyVehiclesSplit() {
  console.log('🔍 FASE E - VEHICLES SPLIT VERIFICATIE');
  console.log('=====================================');
  
  let exitCode = 0;
  
  try {
    // E1) Verify 3 categories exist + are active
    console.log('📁 E1) CATEGORIES VERIFICATION:');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug, sort_order, is_active, icon_url')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'camper-mobilhomes'])
      .eq('is_active', true);
    
    if (catError) {
      console.error('❌ Categories fetch failed:', catError);
      exitCode = 1;
    } else if (categories.length !== 3) {
      console.error(`❌ Expected 3 categories, found ${categories.length}`);
      exitCode = 1;
    } else {
      console.log('✅ All 3 vehicle categories exist and are active:');
      categories.forEach(cat => {
        const hasIcon = cat.icon_url ? '✓' : '❌';
        console.log(`  ${cat.id} | ${cat.name} | ${cat.slug} | sort:${cat.sort_order} | icon:${hasIcon}`);
      });
    }
    
    // E2) Verify icons are filled
    console.log('\n🎨 E2) ICON VERIFICATION:');
    const categoriesWithoutIcons = categories.filter(cat => !cat.icon_url);
    if (categoriesWithoutIcons.length > 0) {
      console.error(`❌ ${categoriesWithoutIcons.length} categories missing icons:`);
      categoriesWithoutIcons.forEach(cat => console.log(`  - ${cat.name}`));
      exitCode = 1;
    } else {
      console.log('✅ All vehicle categories have icons');
    }
    
    // E3) Verify brands per category (via subcategories)
    console.log('\n🏭 E3) BRANDS PER CATEGORY VERIFICATION:');
    
    for (const category of categories) {
      const { data: subcats, error: subError } = await supabase
        .from('subcategories')
        .select('id, name, slug')
        .eq('category_id', category.id);
      
      if (subError) {
        console.error(`❌ Subcategories fetch failed for ${category.name}:`, subError);
        exitCode = 1;
      } else {
        const brandCount = subcats.length;
        const status = brandCount >= 10 && brandCount <= 25 ? '✅' : '⚠️';
        console.log(`  ${status} ${category.name}: ${brandCount} brands`);
        
        if (brandCount > 0) {
          console.log(`    Sample: ${subcats.slice(0, 5).map(s => s.name).join(', ')}...`);
        }
        
        if (brandCount === 0) {
          console.error(`    ❌ No brands found for ${category.name}`);
          exitCode = 1;
        } else if (brandCount > 25) {
          console.warn(`    ⚠️ Too many brands (${brandCount}) for ${category.name}, should be max 25`);
        }
      }
    }
    
    // E4) Check for duplicate category slugs
    console.log('\n🔍 E4) DUPLICATE CATEGORY SLUGS CHECK:');
    const { data: allCats, error: allCatError } = await supabase
      .from('categories')
      .select('slug')
      .eq('is_active', true);
    
    if (allCatError) {
      console.error('❌ All categories fetch failed:', allCatError);
      exitCode = 1;
    } else {
      const slugCounts = {};
      allCats.forEach(cat => {
        slugCounts[cat.slug] = (slugCounts[cat.slug] || 0) + 1;
      });
      
      const duplicates = Object.entries(slugCounts).filter(([, count]) => count > 1);
      if (duplicates.length > 0) {
        console.error('❌ Duplicate category slugs found:', duplicates);
        exitCode = 1;
      } else {
        console.log('✅ No duplicate category slugs');
      }
    }
    
    // E5) Check for duplicate brand slugs within each category
    console.log('\n🔍 E5) DUPLICATE BRAND SLUGS CHECK:');
    
    for (const category of categories) {
      const { data: subcats, error: subError } = await supabase
        .from('subcategories')
        .select('slug')
        .eq('category_id', category.id);
      
      if (!subError) {
        const slugCounts = {};
        subcats.forEach(sub => {
          slugCounts[sub.slug] = (slugCounts[sub.slug] || 0) + 1;
        });
        
        const duplicates = Object.entries(slugCounts).filter(([, count]) => count > 1);
        if (duplicates.length > 0) {
          console.error(`❌ Duplicate brand slugs in ${category.name}:`, duplicates);
          exitCode = 1;
        } else {
          console.log(`✅ No duplicate brand slugs in ${category.name}`);
        }
      }
    }
    
    // E6) Summary
    console.log('\n🎯 VERIFICATION SUMMARY:');
    if (exitCode === 0) {
      console.log('✅ ALL CHECKS PASSED - VEHICLES SPLIT SUCCESSFUL!');
      console.log('\n🚀 NEXT STEPS:');
      console.log('- Test /explore page: should show 3 vehicle categories');
      console.log('- Test marketplace filters: /marketplace?category=auto-motor');
      console.log('- Test marketplace filters: /marketplace?category=bedrijfswagens'); 
      console.log('- Test marketplace filters: /marketplace?category=camper-mobilhomes');
    } else {
      console.log('❌ SOME CHECKS FAILED - SEE ERRORS ABOVE');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    exitCode = 1;
  }
  
  process.exit(exitCode);
}

verifyVehiclesSplit();
