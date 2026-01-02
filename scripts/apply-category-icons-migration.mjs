#!/usr/bin/env node

/**
 * Apply category icons migration
 * Adds missing Tabler icons to all active categories
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Icon mappings: slug -> icon URL
const iconMappings = {
  'elektronica': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-laptop.svg',
  'huis-tuin': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/home.svg',
  'auto-motor': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/car.svg',
  'mode-schoenen': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/shirt.svg',
  'sport-hobby': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ball-tennis.svg',
  'boeken-media': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/book.svg',
  'baby-kind': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/baby-carriage.svg',
  'zakelijk': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building-store.svg',
  'bedrijfswagens': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/truck.svg',
  'motoren': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/motorbike.svg',
  'camper-mobilhomes': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/caravan.svg',
  'phones-tablets': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-mobile.svg',
  'computers': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-desktop.svg',
  'fietsen-brommers': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/bike.svg',
  'hobbys': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/palette.svg',
  'muziek-boeken-films': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/music.svg',
  'games': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/device-gamepad.svg',
  'dieren': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/paw.svg',
  'bouw': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/tools.svg',
  'tickets': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/ticket.svg',
  'diensten': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/briefcase.svg',
  'immo': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/building.svg',
  'gratis': 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/gift.svg',
};

async function applyMigration() {
  console.log('🚀 APPLYING CATEGORY ICONS MIGRATION');
  console.log('=====================================\n');
  console.log(`📡 Connecting to: ${supabaseUrl}\n`);
  
  try {
    // Step 1: Normalize existing icon URLs (replace @tabler/icons with tabler-icons)
    console.log('📝 Step 1: Normalizing existing icon URLs...');
    const { data: categoriesWithOldFormat, error: fetchError } = await supabase
      .from('categories')
      .select('id, slug, icon_url')
      .not('icon_url', 'is', null)
      .like('icon_url', '%@tabler/icons%');
    
    if (fetchError) {
      console.error('❌ Failed to fetch categories:', fetchError);
      throw fetchError;
    }
    
    if (categoriesWithOldFormat && categoriesWithOldFormat.length > 0) {
      console.log(`   Found ${categoriesWithOldFormat.length} categories with old URL format`);
      for (const cat of categoriesWithOldFormat) {
        const normalizedUrl = cat.icon_url.replace('@tabler/icons@latest', 'tabler-icons@latest');
        const { error: updateError } = await supabase
          .from('categories')
          .update({ icon_url: normalizedUrl })
          .eq('id', cat.id);
        
        if (updateError) {
          console.error(`   ❌ Failed to update ${cat.slug}: ${updateError.message}`);
        } else {
          console.log(`   ✅ Normalized ${cat.slug}`);
        }
      }
    } else {
      console.log('   ✅ No categories with old URL format found');
    }
    
    // Step 2: Add icons to categories that don't have them
    console.log('\n📝 Step 2: Adding icons to categories without icons...');
    
    // First, get all active categories
    const { data: allCategories, error: allCatsError } = await supabase
      .from('categories')
      .select('id, name, slug, icon_url, is_active')
      .eq('is_active', true);
    
    if (allCatsError) {
      console.error('❌ Failed to fetch categories:', allCatsError);
      throw allCatsError;
    }
    
    console.log(`   Found ${allCategories.length} active categories`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const cat of allCategories) {
      // Skip if already has an icon
      if (cat.icon_url && cat.icon_url.trim() !== '') {
        skippedCount++;
        continue;
      }
      
      // Find icon for this slug
      const iconUrl = iconMappings[cat.slug] || 'https://cdn.jsdelivr.net/npm/tabler-icons@latest/icons/category.svg';
      
      const { error: updateError } = await supabase
        .from('categories')
        .update({ icon_url: iconUrl })
        .eq('id', cat.id)
        .is('icon_url', null);
      
      if (updateError) {
        console.error(`   ❌ Failed to update ${cat.name} (${cat.slug}): ${updateError.message}`);
      } else {
        console.log(`   ✅ Added icon to ${cat.name} (${cat.slug})`);
        updatedCount++;
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Updated: ${updatedCount} categories`);
    console.log(`   ⏭️  Skipped: ${skippedCount} categories (already have icons)`);
    
    // Step 3: Verification
    console.log('\n🔍 Step 3: Verification...');
    const { data: finalCategories, error: verifyError } = await supabase
      .from('categories')
      .select('id, name, slug, icon_url, is_active')
      .eq('is_active', true)
      .order('sort_order');
    
    if (verifyError) {
      console.error('❌ Failed to verify:', verifyError);
    } else {
      const withIcons = finalCategories.filter(c => c.icon_url && c.icon_url.trim() !== '');
      const withoutIcons = finalCategories.filter(c => !c.icon_url || c.icon_url.trim() === '');
      
      console.log(`   Total active categories: ${finalCategories.length}`);
      console.log(`   Categories with icons: ${withIcons.length}`);
      
      if (withoutIcons.length > 0) {
        console.log(`   ⚠️  Categories without icons: ${withoutIcons.length}`);
        withoutIcons.forEach(cat => {
          console.log(`      - ${cat.name} (${cat.slug})`);
        });
      } else {
        console.log(`   ✅ All categories have icons!`);
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
