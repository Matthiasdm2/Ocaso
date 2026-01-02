#!/usr/bin/env node

/**
 * Check category icons status
 * Lists all categories and their icon URLs to identify issues
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
  console.log('🔍 CHECKING CATEGORY ICONS STATUS');
  console.log('==================================\n');
  
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug, icon_url, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) {
      console.error('❌ Failed to fetch categories:', error);
      process.exit(1);
    }
    
    if (!categories || categories.length === 0) {
      console.log('⚠️  No active categories found');
      return;
    }
    
    console.log(`📊 Found ${categories.length} active categories\n`);
    
    // Categorize categories
    const withIcons = categories.filter(c => c.icon_url && c.icon_url.trim() !== '');
    const withoutIcons = categories.filter(c => !c.icon_url || c.icon_url.trim() === '');
    const oldFormat = categories.filter(c => c.icon_url && c.icon_url.includes('@tabler/icons'));
    const correctFormat = categories.filter(c => 
      c.icon_url && 
      c.icon_url.includes('tabler-icons@latest') && 
      !c.icon_url.includes('@tabler/icons')
    );
    
    console.log('📈 Summary:');
    console.log(`   ✅ Correct format: ${correctFormat.length}`);
    console.log(`   ⚠️  Old format (@tabler/icons): ${oldFormat.length}`);
    console.log(`   ❌ No icon: ${withoutIcons.length}`);
    console.log(`   📦 Total with icons: ${withIcons.length}\n`);
    
    if (oldFormat.length > 0) {
      console.log('⚠️  Categories with OLD format (@tabler/icons):');
      oldFormat.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.slug})`);
        console.log(`     URL: ${cat.icon_url}`);
      });
      console.log('');
    }
    
    if (withoutIcons.length > 0) {
      console.log('❌ Categories WITHOUT icons:');
      withoutIcons.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.slug})`);
      });
      console.log('');
    }
    
    console.log('📋 All categories:');
    categories.forEach((cat, index) => {
      const status = !cat.icon_url || cat.icon_url.trim() === '' 
        ? '❌ No icon'
        : cat.icon_url.includes('@tabler/icons')
        ? '⚠️  Old format'
        : '✅ OK';
      
      console.log(`   ${index + 1}. ${status} - ${cat.name} (${cat.slug})`);
      if (cat.icon_url) {
        console.log(`      ${cat.icon_url}`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

checkCategories().catch(console.error);

