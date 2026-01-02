#!/usr/bin/env node
/**
 * Apply business JSONB column migration to Supabase database
 * 
 * This script applies the migration that adds the 'business' JSONB column
 * to the profiles table. Safe to run multiple times (idempotent).
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
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 APPLYING BUSINESS JSONB COLUMN MIGRATION');
  console.log('=' .repeat(60));
  console.log(`📡 Connecting to: ${supabaseUrl}`);
  console.log('');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260101210000_add_business_jsonb_column.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📁 Migration file loaded');
    console.log(`📝 SQL to execute:`);
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('');

    // Check if column already exists
    console.log('🔍 Checking if column already exists...');
    const { data: checkResult, error: checkError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'business'
        ) as column_exists;
      `
    }).catch(() => {
      // If exec_sql doesn't exist, try direct query
      return { data: null, error: null };
    });

    // Try alternative method: execute SQL directly
    console.log('⚡ Executing migration SQL...');
    
    // Split SQL into statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);

    for (const statement of statements) {
      console.log(`   Executing: ${statement.substring(0, 50)}...`);
      
      // Use Supabase client to execute SQL via RPC or direct query
      // Note: Supabase JS client doesn't support raw SQL directly
      // We'll need to use a different approach
      
      // Try to execute via a stored procedure or use psql
      const { error } = await supabase.rpc('exec_sql', { 
        query: statement + ';' 
      }).catch(async () => {
        // Fallback: Try to check if we can use PostgREST to verify
        // For actual migration, we recommend using Supabase Dashboard SQL Editor
        // or psql directly
        return { error: { message: 'Direct SQL execution not available via JS client' } };
      });

      if (error) {
        // If exec_sql doesn't exist, we need to use a different method
        if (error.message?.includes('exec_sql') || error.message?.includes('not available')) {
          console.log('');
          console.log('⚠️  Direct SQL execution via JS client is not available.');
          console.log('');
          console.log('📋 ALTERNATIVE METHODS TO APPLY MIGRATION:');
          console.log('');
          console.log('OPTIE 1: Via Supabase Dashboard (Aanbevolen)');
          console.log('   1. Ga naar: https://supabase.com/dashboard');
          console.log('   2. Selecteer je project');
          console.log('   3. Ga naar SQL Editor');
          console.log('   4. Kopieer en plak de volgende SQL:');
          console.log('');
          console.log('─'.repeat(60));
          console.log(migrationSQL);
          console.log('─'.repeat(60));
          console.log('');
          console.log('   5. Klik "Run"');
          console.log('');
          console.log('OPTIE 2: Via psql (als je DATABASE_URL hebt)');
          console.log('   psql $DATABASE_URL -f supabase/migrations/20260101210000_add_business_jsonb_column.sql');
          console.log('');
          console.log('OPTIE 3: Via Supabase CLI (als je project linked hebt)');
          console.log('   supabase db push');
          console.log('');
          
          // Try to verify if column exists by querying profiles
          console.log('🔍 Verifying current state...');
          const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id, business_plan')
            .limit(1);
          
          if (testError) {
            console.error('❌ Error querying profiles:', testError.message);
          } else {
            console.log('✅ Can query profiles table');
            
            // Try to select business column to see if it exists
            const { error: businessError } = await supabase
              .from('profiles')
              .select('business')
              .limit(1);
            
            if (businessError) {
              if (businessError.message?.includes('column') && businessError.message?.includes('business')) {
                console.log('❌ Column "business" does NOT exist yet');
                console.log('   → Migratie moet worden uitgevoerd');
              } else {
                console.log('⚠️  Could not verify column status:', businessError.message);
              }
            } else {
              console.log('✅ Column "business" EXISTS');
              console.log('   → Migratie is al uitgevoerd of niet nodig');
            }
          }
          
          process.exit(0);
        } else {
          console.error(`❌ Error executing statement:`, error.message);
          throw error;
        }
      }
    }

    console.log('');
    console.log('✅ Migration executed successfully!');
    console.log('');
    
    // Verify
    console.log('🔍 Verifying migration...');
    const { error: verifyError } = await supabase
      .from('profiles')
      .select('business')
      .limit(1);
    
    if (verifyError) {
      if (verifyError.message?.includes('column') && verifyError.message?.includes('business')) {
        console.log('❌ Column still does not exist');
        console.log('   → Migratie moet handmatig worden uitgevoerd (zie opties hierboven)');
      } else {
        console.log('⚠️  Could not verify:', verifyError.message);
      }
    } else {
      console.log('✅ Column "business" exists and is accessible!');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('📋 Please apply the migration manually using one of these methods:');
    console.error('   1. Supabase Dashboard SQL Editor');
    console.error('   2. psql command line');
    console.error('   3. Supabase CLI');
    process.exit(1);
  }
}

applyMigration().catch(console.error);

