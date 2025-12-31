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

async function quickVerify() {
  console.log('🚀 QUICK CANONICAL VERIFICATION');
  console.log('==============================');
  
  try {
    // Check 4 categories exist
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', ['auto-motor', 'bedrijfswagens', 'motoren', 'camper-mobilhomes'])
      .eq('is_active', true);
    
    if (catError) {
      console.error('❌ Categories failed:', catError);
      return;
    }
    
    console.log(`✅ Found ${categories.length}/4 vehicle categories`);
    
    // Check brand counts
    for (const category of categories) {
      const { count } = await supabase
        .from('subcategories')
        .select('id', { count: 'exact' })
        .eq('category_id', category.id);
      
      const expected = category.slug === 'auto-motor' ? 45 : 25;
      const status = count === expected ? '✅' : '❌';
      console.log(`  ${status} ${category.name}: ${count}/${expected} brands`);
    }
    
    console.log('\n🎯 CANONICAL SETUP VERIFIED!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

quickVerify();
