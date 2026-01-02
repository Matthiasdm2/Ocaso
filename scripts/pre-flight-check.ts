#!/usr/bin/env tsx
/**
 * Pre-flight check script voor productie deployment
 * Controleert of alles klaar staat om live te gaan
 * 
 * Gebruik: npm run pre-flight-check
 * Of: npx tsx scripts/pre-flight-check.ts
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
  results.push({ name, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function checkCommand(command: string, errorMessage: string): boolean {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
  } catch (e: any) {
    return '';
  }
}

console.log('🚀 Pre-flight check voor productie deployment\n');
console.log('='.repeat(60));

// 1. Check Supabase CLI
console.log('\n📦 Supabase CLI Checks:');
if (checkCommand('which supabase', '')) {
  const version = execCommand('supabase --version');
  addResult('Supabase CLI', 'pass', `Geïnstalleerd (${version})`);
  
  // Check if linked to project
  try {
    const projectId = execCommand('supabase projects list --output json');
    if (projectId) {
      addResult('Supabase Project Link', 'pass', 'Project gevonden');
    } else {
      addResult('Supabase Project Link', 'warning', 'Geen project gelinkt. Run: supabase link');
    }
  } catch {
    addResult('Supabase Project Link', 'warning', 'Kon project status niet verifiëren');
  }
} else {
  addResult('Supabase CLI', 'fail', 'Niet geïnstalleerd. Installeer via: npm install -g supabase');
}

// 2. Check Vercel CLI
console.log('\n🌐 Vercel CLI Checks:');
if (checkCommand('which vercel', '')) {
  const version = execCommand('vercel --version');
  addResult('Vercel CLI', 'pass', `Geïnstalleerd (${version})`);
  
  // Check if logged in
  try {
    const whoami = execCommand('vercel whoami');
    if (whoami && !whoami.includes('error')) {
      addResult('Vercel Login', 'pass', `Ingelogd als: ${whoami}`);
    } else {
      addResult('Vercel Login', 'fail', 'Niet ingelogd. Run: vercel login');
    }
  } catch {
    addResult('Vercel Login', 'warning', 'Kon login status niet verifiëren');
  }
} else {
  addResult('Vercel CLI', 'fail', 'Niet geïnstalleerd. Installeer via: npm install -g vercel');
}

// 3. Check Environment Variables
console.log('\n🔐 Environment Variables:');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    const masked = envVar.includes('KEY') || envVar.includes('SECRET') 
      ? `${value.substring(0, 10)}...` 
      : value;
    addResult(envVar, 'pass', `Aanwezig: ${masked}`);
  } else {
    addResult(envVar, 'fail', 'Ontbreekt');
  }
});

optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    addResult(envVar, 'pass', 'Aanwezig');
  } else {
    addResult(envVar, 'warning', 'Ontbreekt (optioneel)');
  }
});

// 4. Check Migrations
console.log('\n📊 Database Migrations:');
const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
if (existsSync(migrationsDir)) {
  try {
    const files = execCommand(`ls -1 ${migrationsDir}/*.sql 2>/dev/null | wc -l`);
    const count = parseInt(files) || 0;
    if (count > 0) {
      addResult('Migrations Bestanden', 'pass', `${count} migratie(s) gevonden`);
      
      // Check if migrations are applied (requires Supabase link)
      try {
        const status = execCommand('supabase migration list --output json 2>/dev/null');
        if (status && status !== '[]') {
          addResult('Migrations Status', 'pass', 'Migrations kunnen worden gecontroleerd');
        } else {
          addResult('Migrations Status', 'warning', 'Kon migratie status niet verifiëren. Link project eerst.');
        }
      } catch {
        addResult('Migrations Status', 'warning', 'Kon migratie status niet verifiëren');
      }
    } else {
      addResult('Migrations Bestanden', 'warning', 'Geen migraties gevonden');
    }
  } catch {
    addResult('Migrations Bestanden', 'warning', 'Kon migraties niet tellen');
  }
} else {
  addResult('Migrations Directory', 'warning', 'Migrations directory niet gevonden');
}

// 5. Check RLS Policies (via SQL check)
console.log('\n🔒 Row Level Security Policies:');
const criticalPolicies = [
  { table: 'profiles', policy: 'profiles_select_public', description: 'Profiles publiek leesbaar' },
  { table: 'listings', policy: 'listings_select_policy', description: 'Listings publiek leesbaar' },
  { table: 'categories', policy: 'categories_select_public', description: 'Categories publiek leesbaar' },
];

// Note: We can't easily check RLS without connecting to Supabase
// So we'll check if the migration files exist that create these policies
criticalPolicies.forEach(({ table, policy, description }) => {
  try {
    const grepResult = execCommand(`grep -r "${policy}" ${migrationsDir}/*.sql 2>/dev/null | head -1`);
    if (grepResult) {
      addResult(`${table} RLS Policy`, 'pass', `${description} - Policy gevonden in migraties`);
    } else {
      addResult(`${table} RLS Policy`, 'warning', `${description} - Policy niet gevonden in migraties`);
    }
  } catch {
    addResult(`${table} RLS Policy`, 'warning', `${description} - Kon niet verifiëren`);
  }
});

// 6. Check Build
console.log('\n🏗️ Build Checks:');
try {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  if (packageJson.scripts?.build) {
    addResult('Build Script', 'pass', 'Build script aanwezig');
    
    // Try to check if build would succeed (dry run)
    try {
      const typeCheck = execCommand('npx tsc --noEmit 2>&1 | head -5');
      if (typeCheck.includes('error')) {
        addResult('TypeScript Check', 'fail', 'TypeScript errors gevonden');
        console.log(`   Eerste errors:\n${typeCheck.split('\n').slice(0, 3).map(l => `   ${l}`).join('\n')}`);
      } else {
        addResult('TypeScript Check', 'pass', 'Geen TypeScript errors');
      }
    } catch {
      addResult('TypeScript Check', 'warning', 'Kon TypeScript niet checken');
    }
  } else {
    addResult('Build Script', 'fail', 'Build script ontbreekt in package.json');
  }
} catch {
  addResult('Package.json', 'fail', 'Kon package.json niet lezen');
}

// 7. Check OAuth Configuration
console.log('\n🔐 OAuth Configuration:');
const oauthFiles = [
  'app/auth/callback/route.ts',
  'app/login/page.tsx',
];

oauthFiles.forEach(file => {
  const filePath = join(process.cwd(), file);
  if (existsSync(filePath)) {
    addResult(`OAuth File: ${file}`, 'pass', 'Bestand bestaat');
  } else {
    addResult(`OAuth File: ${file}`, 'fail', 'Bestand ontbreekt');
  }
});

// Check if NEXT_PUBLIC_SITE_URL is set for OAuth
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (siteUrl) {
  if (siteUrl.startsWith('https://')) {
    addResult('OAuth Site URL', 'pass', `HTTPS URL: ${siteUrl}`);
  } else if (siteUrl.startsWith('http://localhost')) {
    addResult('OAuth Site URL', 'warning', `Lokale URL: ${siteUrl} (OK voor development)`);
  } else {
    addResult('OAuth Site URL', 'fail', `Geen HTTPS URL: ${siteUrl}`);
  }
} else {
  addResult('OAuth Site URL', 'fail', 'NEXT_PUBLIC_SITE_URL niet ingesteld');
}

// 8. Check Vercel Project
console.log('\n🚀 Vercel Deployment:');
try {
  const vercelProject = execCommand('vercel project ls --output json 2>/dev/null');
  if (vercelProject && vercelProject !== '[]') {
    addResult('Vercel Project', 'pass', 'Project gevonden');
    
    // Check latest deployment
    try {
      const deployments = execCommand('vercel ls --output json 2>/dev/null | head -20');
      if (deployments) {
        addResult('Vercel Deployments', 'pass', 'Deployments gevonden');
      }
    } catch {
      addResult('Vercel Deployments', 'warning', 'Kon deployments niet ophalen');
    }
  } else {
    addResult('Vercel Project', 'warning', 'Geen project gevonden. Run: vercel link');
  }
} catch {
  addResult('Vercel Project', 'warning', 'Kon Vercel project niet verifiëren');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📋 Summary:');

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warning').length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings}`);

if (failed > 0) {
  console.log('\n❌ KRITIEKE PROBLEMEN GEVONDEN:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`   - ${r.name}: ${r.message}`);
  });
}

if (warnings > 0) {
  console.log('\n⚠️  WAARSCHUWINGEN:');
  results.filter(r => r.status === 'warning').forEach(r => {
    console.log(`   - ${r.name}: ${r.message}`);
  });
}

if (failed === 0 && warnings === 0) {
  console.log('\n🎉 Alles ziet er goed uit! Je kunt deployen.');
} else if (failed === 0) {
  console.log('\n✅ Geen kritieke problemen. Controleer waarschuwingen voordat je deployt.');
} else {
  console.log('\n🚨 Los eerst de kritieke problemen op voordat je deployt.');
}

console.log('\n' + '='.repeat(60));
console.log('\n📝 Volgende stappen:');
console.log('1. Los alle ❌ kritieke problemen op');
console.log('2. Controleer ⚠️  waarschuwingen');
console.log('3. Voer migraties uit: supabase migration up');
console.log('4. Deploy naar Vercel: vercel --prod');
console.log('5. Controleer OAuth configuratie in Supabase Dashboard\n');

process.exit(failed > 0 ? 1 : 0);

