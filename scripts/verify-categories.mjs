#!/usr/bin/env node

/**
 * CATEGORIES VERIFICATION SCRIPT V2
 * Verifieert icons, subcategories, en vehicle brand mapping
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function verifyCategories() {
  console.log('🔍 CATEGORIES HOTFIX V2 VERIFICATION\n');

  // Test 1: Check all active categories have icon_url
  const { data: cats, error: catsError } = await supabase
    .from('categories')
    .select('id, name, slug, icon_url, is_active')
    .eq('is_active', true)
    .order('sort_order');

  if (catsError) {
    console.error('❌ Failed to fetch categories:', catsError);
    return;
  }

  console.log('📋 ACTIVE CATEGORIES:');
  let iconCount = 0;
  cats.forEach(cat => {
    const hasIcon = cat.icon_url ? '✅' : '❌';
    if (cat.icon_url) iconCount++;
    console.log(`${hasIcon} ${cat.name} (${cat.slug}) - Icon: ${cat.icon_url ? 'YES' : 'NO'}`);
  });
  console.log(`\n📊 ${iconCount}/${cats.length} categories have icons\n`);

  // Test 2: Check subcategories mapping
  const { data: subs, error: subsError } = await supabase
    .from('subcategories')
    .select('id, name, category_id')
    .order('category_id');

  if (subsError) {
    console.error('❌ Failed to fetch subcategories:', subsError);
    return;
  }

  const subsByCategory = {};
  subs.forEach(sub => {
    subsByCategory[sub.category_id] = (subsByCategory[sub.category_id] || 0) + 1;
  });

  console.log('🔗 SUBCATEGORIES MAPPING:');
  cats.forEach(cat => {
    const count = subsByCategory[cat.id] || 0;
    const status = count > 0 ? '✅' : '⚠️';
    console.log(`${status} ${cat.name} (ID ${cat.id}): ${count} subcategories`);
  });

  // Test 3: Check vehicle brands (25 per vehicle type)
  const { data: brands, error: brandsError } = await supabase
    .from('vehicle_brands')
    .select('vehicle_type')
    .eq('is_active', true);

  if (!brandsError && brands) {
    const brandsByType = {};
    brands.forEach(brand => {
      brandsByType[brand.vehicle_type] = (brandsByType[brand.vehicle_type] || 0) + 1;
    });

    console.log('\n🚗 VEHICLE BRANDS MAPPING:');
    Object.entries(brandsByType).forEach(([type, count]) => {
      const status = count === 25 ? '✅' : '⚠️';
      console.log(`${status} ${type}: ${count} brands (expected: 25)`);
    });
  }

  // Test 4: Check for duplicate slugs
  const slugCounts = {};
  cats.forEach(cat => {
    slugCounts[cat.slug] = (slugCounts[cat.slug] || 0) + 1;
  });

  console.log('\n🏷️ SLUG UNIQUENESS:');
  let duplicates = 0;
  Object.entries(slugCounts).forEach(([slug, count]) => {
    if (count > 1) {
      console.log(`❌ Duplicate slug: ${slug} (${count} times)`);
      duplicates++;
    }
  });
  if (duplicates === 0) {
    console.log('✅ All slugs are unique');
  }

  // Test 5: API endpoint test
  console.log('\n🌐 API ENDPOINT TEST:');
  try {
    const res = await fetch('http://localhost:3000/api/categories');
    if (res.ok) {
      const apiData = await res.json();
      console.log(`✅ API returns ${apiData.length} categories`);
      
      const withSubs = apiData.filter(cat => cat.subcategories && cat.subcategories.length > 0);
      console.log(`✅ ${withSubs.length} categories have subcategories in API response`);
      
      const withIcons = apiData.filter(cat => cat.icon_url);
      console.log(`✅ ${withIcons.length} categories have icon_url in API response`);
    } else {
      console.log(`❌ API failed: ${res.status}`);
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }

  console.log('\n🎯 VERIFICATION COMPLETE!');
}

verifyCategories().catch(console.error);
