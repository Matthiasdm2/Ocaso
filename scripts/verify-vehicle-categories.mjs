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

// CANONICAL EXPECTATIONS (FROZEN CONTRACT)
const EXPECTED_CATEGORIES = {
  'auto-motor': { name: 'Auto & Motor', brandCount: 45 },
  'bedrijfswagens': { name: 'Bedrijfswagens', brandCount: 25 },
  'motoren': { name: 'Motoren', brandCount: 25 },
  'camper-mobilhomes': { name: 'Camper & Mobilhomes', brandCount: 25 }
};

const TOTAL_EXPECTED_BRANDS = 45 + 25 + 25 + 25; // 120 brands total

async function verifyVehicleCategories() {
  console.log('🔍 VEHICLE CATEGORIES VERIFICATION');
  console.log('=================================');
  console.log('FROZEN CONTRACT COMPLIANCE CHECK');
  console.log('================================');
  
  let exitCode = 0;
  const errors = [];
  
  try {
    // Test 1: Verify 4 categories exist and are active
    console.log('\n📁 TEST 1: CATEGORIES EXISTENCE & STATUS');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug, sort_order, is_active, icon_url')
      .in('slug', Object.keys(EXPECTED_CATEGORIES))
      .eq('is_active', true);
    
    if (catError) {
      errors.push(`Categories fetch failed: ${catError.message}`);
      exitCode = 1;
    } else if (categories.length !== 4) {
      errors.push(`Expected 4 categories, found ${categories.length}`);
      exitCode = 1;
    } else {
      console.log('✅ All 4 vehicle categories exist and are active');
      categories.forEach(cat => {
        const hasIcon = cat.icon_url ? '✓' : '❌';
        console.log(`  ${cat.id} | ${cat.name} | ${cat.slug} | sort:${cat.sort_order} | icon:${hasIcon}`);
      });
    }
    
    // Test 2: Verify exact brand counts per category
    console.log('\n🏭 TEST 2: EXACT BRAND COUNTS (FROZEN CONTRACT)');
    for (const category of categories) {
      const expected = EXPECTED_CATEGORIES[category.slug];
      
      const { count: brandCount, error: brandError } = await supabase
        .from('subcategories')
        .select('id', { count: 'exact' })
        .eq('category_id', category.id);
      
      if (brandError) {
        errors.push(`Brand count failed for ${category.name}: ${brandError.message}`);
        exitCode = 1;
      } else if (brandCount !== expected.brandCount) {
        errors.push(`${category.name}: expected ${expected.brandCount} brands, found ${brandCount}`);
        exitCode = 1;
        console.log(`  ❌ ${category.name}: ${brandCount}/${expected.brandCount} brands`);
      } else {
        console.log(`  ✅ ${category.name}: ${brandCount}/${expected.brandCount} brands`);
      }
    }
    
    // Test 3: Verify no duplicate slugs within each category
    console.log('\n🔍 TEST 3: NO DUPLICATE BRAND SLUGS PER CATEGORY');
    for (const category of categories) {
      const { data: subcats, error: subError } = await supabase
        .from('subcategories')
        .select('slug')
        .eq('category_id', category.id);
      
      if (subError) {
        errors.push(`Subcategories fetch failed for ${category.name}: ${subError.message}`);
        exitCode = 1;
      } else {
        const slugCounts = {};
        subcats.forEach(sub => {
          slugCounts[sub.slug] = (slugCounts[sub.slug] || 0) + 1;
        });
        
        const duplicates = Object.entries(slugCounts).filter(([, count]) => count > 1);
        if (duplicates.length > 0) {
          errors.push(`Duplicate brand slugs in ${category.name}: ${duplicates.map(([slug]) => slug).join(', ')}`);
          exitCode = 1;
          console.log(`  ❌ ${category.name}: ${duplicates.length} duplicate slugs`);
        } else {
          console.log(`  ✅ ${category.name}: no duplicate slugs`);
        }
      }
    }
    
    // Test 4: Verify no brand appears in multiple vehicle categories
    console.log('\n🚫 TEST 4: NO BRAND IN MULTIPLE VEHICLE CATEGORIES');
    const allVehicleBrands = new Set();
    const duplicateFindings = [];
    
    for (const category of categories) {
      const { data: subcats, error: subError } = await supabase
        .from('subcategories')
        .select('name, slug')
        .eq('category_id', category.id);
      
      if (!subError) {
        subcats.forEach(sub => {
          if (allVehicleBrands.has(sub.slug)) {
            duplicateFindings.push(`Brand "${sub.name}" (${sub.slug}) appears in multiple categories`);
          } else {
            allVehicleBrands.add(sub.slug);
          }
        });
      }
    }
    
    if (duplicateFindings.length > 0) {
      errors.push(...duplicateFindings);
      exitCode = 1;
      console.log(`  ❌ ${duplicateFindings.length} brands appear in multiple categories`);
    } else {
      console.log(`  ✅ All ${allVehicleBrands.size} brands are unique across categories`);
    }
    
    // Test 5: Verify total brand count
    console.log('\n📊 TEST 5: TOTAL BRAND COUNT VERIFICATION');
    if (allVehicleBrands.size !== TOTAL_EXPECTED_BRANDS) {
      errors.push(`Expected ${TOTAL_EXPECTED_BRANDS} total brands, found ${allVehicleBrands.size}`);
      exitCode = 1;
      console.log(`  ❌ Total brands: ${allVehicleBrands.size}/${TOTAL_EXPECTED_BRANDS}`);
    } else {
      console.log(`  ✅ Total brands: ${allVehicleBrands.size}/${TOTAL_EXPECTED_BRANDS}`);
    }
    
    // Test 6: Verify category icons
    console.log('\n🎨 TEST 6: CATEGORY ICONS VERIFICATION');
    const categoriesWithoutIcons = categories.filter(cat => !cat.icon_url);
    if (categoriesWithoutIcons.length > 0) {
      errors.push(`Categories missing icons: ${categoriesWithoutIcons.map(cat => cat.name).join(', ')}`);
      exitCode = 1;
      console.log(`  ❌ ${categoriesWithoutIcons.length} categories missing icons`);
    } else {
      console.log('  ✅ All vehicle categories have icons');
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(50));
    if (exitCode === 0) {
      console.log('✅ FROZEN CONTRACT COMPLIANCE: PASSED');
      console.log('✅ ALL VERIFICATION TESTS PASSED');
      console.log('\n🚀 VEHICLE CATEGORIES ARE AUDIT-PROOF:');
      console.log('  - 4 vehicle categories with exact brand counts');
      console.log('  - No duplicate brands across categories');
      console.log('  - All categories have icons');
      console.log('  - Single source of truth established');
      console.log('\n🎯 READY FOR PRODUCTION & INVESTOR REVIEW');
    } else {
      console.log('❌ FROZEN CONTRACT COMPLIANCE: FAILED');
      console.log(`❌ ${errors.length} CRITICAL ERRORS FOUND:`);
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log('\n🚨 IMMEDIATE ACTION REQUIRED');
    }
    
  } catch (err) {
    console.error('❌ Verification failed with unexpected error:', err);
    exitCode = 1;
  }
  
  process.exit(exitCode);
}

// Self-test mode
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyVehicleCategories();
}

export default verifyVehicleCategories;
