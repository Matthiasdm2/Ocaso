import { createClient } from '@/lib/supabaseClient';

async function analyzeCurrentSchema() {
  console.log("=== SUPABASE SCHEMA AUDIT (via app client) ===\n");

  try {
    // Check categories table
    console.log("1. CATEGORIES TABLE:");
    const { data: categories, error: catError } = await createClient()
      .from('categories')
      .select('*')
      .limit(10);

    if (catError) {
      console.log("   ❌ Error accessing categories:", catError.message);
    } else {
      console.log(`   ✅ Found ${categories?.length || 0} categories (sample)`);
      categories?.forEach((cat: any, i: number) => {
        if (i < 5) console.log(`      ${cat.id}: ${cat.name} (${cat.slug}) - sort: ${cat.sort_order}`);
      });
    }

    // Check subcategories table  
    console.log("\n2. SUBCATEGORIES TABLE:");
    const { data: subcats, error: subError } = await createClient()
      .from('subcategories')
      .select('*')
      .limit(10);

    if (subError) {
      console.log("   ❌ Error accessing subcategories:", subError.message);
    } else {
      console.log(`   ✅ Found ${subcats?.length || 0} subcategories (sample)`);
      subcats?.forEach((sub: any, i: number) => {
        if (i < 5) console.log(`      ${sub.id}: ${sub.name} (${sub.slug}) - cat_id: ${sub.category_id}`);
      });
    }

    // Check vehicle_brands table
    console.log("\n3. VEHICLE_BRANDS TABLE:");
    const { data: brands, error: brandsError } = await createClient()
      .from('vehicle_brands')
      .select('*')
      .limit(10);

    if (brandsError) {
      console.log("   ❌ Error accessing vehicle_brands:", brandsError.message);
      console.log("   → This table likely doesn't exist yet");
    } else {
      console.log(`   ✅ Found ${brands?.length || 0} vehicle brands (sample)`);
      brands?.forEach((brand: any, i: number) => {
        if (i < 5) console.log(`      ${brand.id}: ${brand.name} (${brand.slug}) - type: ${brand.vehicle_type}`);
      });
    }

    // Check category_vehicle_brands mapping
    console.log("\n4. CATEGORY_VEHICLE_BRANDS MAPPING:");
    const { data: mappings, error: mapError } = await createClient()
      .from('category_vehicle_brands')
      .select('*')
      .limit(10);

    if (mapError) {
      console.log("   ❌ Error accessing category_vehicle_brands:", mapError.message);
      console.log("   → This table likely doesn't exist yet");
    } else {
      console.log(`   ✅ Found ${mappings?.length || 0} mappings (sample)`);
    }

    // Test for hardcoded data usage
    console.log("\n5. TESTING EXISTING CATEGORY ACCESS PATTERNS:");
    
    // Test current category service if exists
    try {
      const { getCategoriesWithSubcategories } = await import('@/lib/services/category.service');
      console.log("   ✅ Found existing category service");
    } catch {
      console.log("   ❌ No unified category service found - needs to be created");
    }

    // Test brand service
    try {
      const { getBrandsByVehicleType } = await import('@/lib/services/brand.service');
      console.log("   ✅ Found existing brand service");
      
      // Test brand access
      const testBrands = await getBrandsByVehicleType('car');
      console.log(`   → Brand service test: ${testBrands?.length || 0} car brands found`);
    } catch (error: any) {
      console.log("   ❌ Brand service error:", error.message);
    }

  } catch (error: any) {
    console.error("Schema analysis failed:", error.message);
  }
}

analyzeCurrentSchema().catch(console.error);
