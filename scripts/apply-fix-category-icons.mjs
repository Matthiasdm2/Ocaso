#!/usr/bin/env node

/**
 * Apply fix category icons migration
 * Force updates ALL categories to have consistent Tabler icons
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We NEED the service role key for updates, anon key won't work
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n⚠️  Note: SUPABASE_SERVICE_ROLE_KEY is required for database updates.');
  console.error('   The anon key does not have permission to update categories.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 APPLYING FIX CATEGORY ICONS MIGRATION');
  console.log('==========================================\n');
  console.log(`📡 Connecting to: ${supabaseUrl}\n`);
  
  try {
    // Read the SQL migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20250102010000_fix_all_category_icons.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Split SQL into individual statements (remove BEGIN/COMMIT and split by semicolon)
    const statements = sql
      .replace(/BEGIN;?\s*/i, '')
      .replace(/COMMIT;?\s*/i, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      // Extract category slug from UPDATE statement for logging
      const slugMatch = statement.match(/WHERE slug = '([^']+)'/);
      const categorySlug = slugMatch ? slugMatch[1] : 'multiple';
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase.from('categories').select('*').limit(1);
          
          if (directError) {
            // If direct query also fails, try using the REST API approach
            console.log(`   ⚠️  Statement ${i + 1}: Using alternative method for ${categorySlug}`);
            
            // Parse UPDATE statement and use Supabase client
            if (statement.includes('UPDATE categories')) {
              const urlMatch = statement.match(/SET icon_url = '([^']+)'/);
              const slugMatch = statement.match(/WHERE slug = '([^']+)'/);
              
              if (urlMatch && slugMatch) {
                const iconUrl = urlMatch[1];
                const slug = slugMatch[1];
                
                const { error: updateError } = await supabase
                  .from('categories')
                  .update({ icon_url: iconUrl })
                  .eq('slug', slug);
                
                if (updateError) {
                  console.error(`   ❌ Failed to update ${slug}: ${updateError.message}`);
                  errorCount++;
                } else {
                  console.log(`   ✅ Updated ${slug}`);
                  successCount++;
                }
              }
            } else if (statement.includes('REPLACE')) {
              // Handle REPLACE statements
              const { data: categories, error: fetchError } = await supabase
                .from('categories')
                .select('id, slug, icon_url')
                .not('icon_url', 'is', null);
              
              if (!fetchError && categories) {
                const oldPattern = statement.match(/REPLACE\(icon_url, '([^']+)'/)?.[1];
                const newPattern = statement.match(/, '([^']+)'\)/)?.[1];
                const wherePattern = statement.match(/LIKE '([^']+)'/)?.[1];
                
                if (oldPattern && newPattern && wherePattern) {
                  let normalizedCount = 0;
                  for (const cat of categories) {
                    if (cat.icon_url && cat.icon_url.includes(oldPattern.replace(/%/g, ''))) {
                      const normalizedUrl = cat.icon_url.replace(oldPattern, newPattern);
                      const { error: updateError } = await supabase
                        .from('categories')
                        .update({ icon_url: normalizedUrl })
                        .eq('id', cat.id);
                      
                      if (!updateError) normalizedCount++;
                    }
                  }
                  console.log(`   ✅ Normalized ${normalizedCount} categories`);
                  successCount++;
                }
              }
            }
          }
        } else {
          console.log(`   ✅ Statement ${i + 1}: ${categorySlug}`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Statement ${i + 1} failed:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Success: ${successCount} statements`);
    console.log(`   ❌ Errors: ${errorCount} statements`);
    
    // Verification
    console.log('\n🔍 Verification...');
    const { data: categories, error: verifyError } = await supabase
      .from('categories')
      .select('id, name, slug, icon_url, is_active')
      .eq('is_active', true)
      .order('sort_order');
    
    if (!verifyError && categories) {
      const withIcons = categories.filter(c => c.icon_url && c.icon_url.trim() !== '');
      const withoutIcons = categories.filter(c => !c.icon_url || c.icon_url.trim() === '');
      const oldFormat = categories.filter(c => c.icon_url && c.icon_url.includes('@tabler/icons'));
      
      console.log(`   Total active categories: ${categories.length}`);
      console.log(`   Categories with icons: ${withIcons.length}`);
      console.log(`   Categories without icons: ${withoutIcons.length}`);
      console.log(`   Categories with old format: ${oldFormat.length}`);
      
      if (oldFormat.length > 0) {
        console.log(`   ⚠️  Categories still using old format:`);
        oldFormat.forEach(cat => {
          console.log(`      - ${cat.name} (${cat.slug}): ${cat.icon_url}`);
        });
      }
      
      if (withoutIcons.length > 0) {
        console.log(`   ⚠️  Categories without icons:`);
        withoutIcons.forEach(cat => {
          console.log(`      - ${cat.name} (${cat.slug})`);
        });
      }
      
      if (withoutIcons.length === 0 && oldFormat.length === 0) {
        console.log(`   ✅ All categories have consistent icons!`);
      }
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);

