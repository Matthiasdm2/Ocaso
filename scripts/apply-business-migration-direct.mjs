#!/usr/bin/env node
/**
 * Apply business JSONB column migration directly via Supabase client
 * This bypasses the migration system and executes SQL directly
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 APPLYING BUSINESS JSONB COLUMN MIGRATION');
  console.log('=' .repeat(60));
  console.log(`📡 Connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}`);
  console.log('');

  // Read migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260101210000_add_business_jsonb_column.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📁 Migration file loaded');
  console.log('');

  // Check if column already exists by trying to query it
  console.log('🔍 Checking if column already exists...');
  const { error: checkError } = await supabase
    .from('profiles')
    .select('business')
    .limit(1);

  if (!checkError) {
    console.log('✅ Column "business" already exists!');
    console.log('   → Migratie is al uitgevoerd');
    return;
  }

  if (checkError.message?.includes('column') && checkError.message?.includes('business')) {
    console.log('❌ Column does NOT exist yet');
    console.log('   → Migratie moet worden uitgevoerd');
    console.log('');
    console.log('⚠️  Direct SQL execution via JS client is not supported.');
    console.log('');
    console.log('📋 OPTIES OM MIGRATIE UIT TE VOEREN:');
    console.log('');
    console.log('OPTIE 1: Via Supabase Dashboard (Aanbevolen)');
    console.log('   1. Ga naar: https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/sql');
    console.log('   2. Kopieer en plak deze SQL:');
    console.log('');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('');
    console.log('   3. Klik "Run"');
    console.log('');
    console.log('OPTIE 2: Via Supabase CLI (als andere migraties gefixt zijn)');
    console.log('   supabase db push --include-all');
    console.log('');
    console.log('OPTIE 3: Via psql (als DATABASE_URL beschikbaar is)');
    console.log('   psql $DATABASE_URL -f supabase/migrations/20260101210000_add_business_jsonb_column.sql');
    console.log('');
  } else {
    console.log('⚠️  Could not verify column status:', checkError.message);
  }
}

applyMigration().catch(console.error);

