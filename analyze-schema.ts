import { createClient } from '@supabase/supabase-js';
interface ConstraintInfo {
  table_name: string;
  column_name: string;
  constraint_type: string;
}
interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

const SUPABASE_URL = "https://dmnowaqinfkhovhyztan.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function analyzeSchema() {
  console.log("=== SUPABASE SCHEMA AUDIT ===\n");

  // Get all public tables
  console.log("1. ALL PUBLIC TABLES:");
  const { data: tables, error: tablesError } = await supabase.rpc('sql', { 
    query: `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' 
      ORDER BY tablename;
    `
  });
  
  if (tablesError) {
    console.error("Tables error:", tablesError);
    return;
  }

  const tableNames = tables?.map((r: { tablename: string }) => r.tablename) || [];
  console.log("Tables found:", tableNames.length);
  tableNames.forEach((name: string) => console.log(`  - ${name}`));

  // Get category/brand related tables
  console.log("\n2. CATEGORY/BRAND RELATED TABLES:");
  const categoryTables = tableNames.filter((name: string) => 
    name.includes('categor') || 
    name.includes('brand') || 
    name.includes('vehicle')
  );
  categoryTables.forEach((name: string) => console.log(`  ★ ${name}`));

  // Analyze categories table structure
  if (tableNames.includes('categories')) {
    console.log("\n3. CATEGORIES TABLE STRUCTURE:");
    const { data: catCols } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='categories'
        ORDER BY ordinal_position;
      `
    });
    catCols?.forEach((col: ColumnInfo) => console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`));
    
    // Check categories data
    const { data: catData } = await supabase.from('categories').select('*').limit(5);
    console.log("\n   Sample data:");
    catData?.forEach(cat => console.log(`     ${cat.id}: ${cat.name} (${cat.slug})`));
  }

  // Analyze subcategories table structure
  if (tableNames.includes('subcategories')) {
    console.log("\n4. SUBCATEGORIES TABLE STRUCTURE:");
    const { data: subCols } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='subcategories'
        ORDER BY ordinal_position;
      `
    });
    subCols?.forEach((col: ColumnInfo) => console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`));
  }

  // Check vehicle brands table
  if (tableNames.includes('vehicle_brands')) {
    console.log("\n5. VEHICLE_BRANDS TABLE STRUCTURE:");
    const { data: brandCols } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='vehicle_brands'
        ORDER BY ordinal_position;
      `
    });
    brandCols?.forEach((col: ColumnInfo) => console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`));
  } else {
    console.log("\n5. ❌ vehicle_brands table NOT FOUND");
  }

  // Check for mapping table
  const mappingTable = tableNames.find((name: string) => 
    name.includes('category') && name.includes('brand')
  );
  if (mappingTable) {
    console.log(`\n6. MAPPING TABLE FOUND: ${mappingTable}`);
  } else {
    console.log("\n6. ❌ category_vehicle_brands mapping table NOT FOUND");
  }

  // Check constraints and indexes
  console.log("\n7. CONSTRAINTS & INDEXES:");
  const { data: constraints } = await supabase.rpc('sql', {
    query: `
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' 
        AND tc.table_name IN ('categories', 'subcategories', 'vehicle_brands')
      ORDER BY tc.table_name, tc.constraint_type;
    `
  });
  constraints?.forEach((c: ConstraintInfo) => console.log(`  ${c.table_name}.${c.column_name}: ${c.constraint_type}`));

  console.log("\n=== AUDIT COMPLETE ===");
}

analyzeSchema().catch(console.error);
