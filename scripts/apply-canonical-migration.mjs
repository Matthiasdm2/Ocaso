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

async function applyCanonicalMigration() {
  console.log('🚀 APPLYING CANONICAL VEHICLE CATEGORIES MIGRATION');
  console.log('==================================================');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241231150000_canonical_vehicle_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Migration file loaded:', migrationPath);
    console.log('🔧 Size:', migrationSQL.length, 'bytes');
    
    // Split into smaller chunks for execution
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT');
    
    console.log(`⚡ Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 10) { // Skip empty statements
        console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('execute_sql', {
          query: statement + ';'
        });
        
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          // Continue with next statement for non-critical errors
          if (error.code !== '42P07' && error.code !== '23505') { // Not "already exists" or "duplicate key"
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration executed successfully!');
    
    // Verify results
    console.log('\n🔍 VERIFICATION:');
    
    // Check categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug, sort_order, is_active, icon_url')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'motoren', 'camper-mobilhomes'])
      .eq('is_active', true);
    
    if (catError) {
      console.error('❌ Categories check failed:', catError);
    } else {
      console.log('✅ Vehicle categories:');
      categories.forEach(cat => {
        console.log(`  ${cat.id} | ${cat.name} | ${cat.slug} | sort:${cat.sort_order} | icon:${cat.icon_url ? '✓' : '❌'}`);
      });
    }
    
    // Check brands count
    const { count: brandsCount, error: brandsError } = await supabase
      .from('vehicle_brands')
      .select('id', { count: 'exact' })
      .eq('is_active', true);
    
    if (brandsError) {
      console.error('❌ Brands count check failed:', brandsError);
    } else {
      console.log(`✅ Total vehicle brands: ${brandsCount}`);
    }
    
    // Check mappings count per category
    for (const category of categories) {
      const { count: mappingCount, error: mapError } = await supabase
        .from('category_vehicle_brands')
        .select('id', { count: 'exact' })
        .eq('category_id', category.id);
      
      if (mapError) {
        console.error(`❌ Mapping count failed for ${category.name}:`, mapError);
      } else {
        const expectedCount = category.slug === 'auto-motor' ? 45 : 25;
        const status = mappingCount === expectedCount ? '✅' : '❌';
        console.log(`  ${status} ${category.name}: ${mappingCount}/${expectedCount} brands`);
      }
    }
    
    console.log('\n🎯 CANONICAL MIGRATION COMPLETE!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

applyCanonicalMigration();
