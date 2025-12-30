#!/usr/bin/env node

/**
 * verify-smoke-artifacts.mjs
 * 
 * Verifies that E2E smoke test run produced required artifacts
 * Fails if:
 * - playwright-report/ doesn't exist
 * - test-results/.last-run.json missing
 * - last run status is not "passed"
 * 
 * Usage: node scripts/verify-smoke-artifacts.mjs
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const cwd = process.cwd();
const REPORT_DIR = resolve(cwd, 'playwright-report');
const RESULTS_DIR = resolve(cwd, 'test-results');
const LAST_RUN_FILE = resolve(RESULTS_DIR, '.last-run.json');

let errors = [];
let warnings = [];

console.log('🔍 Verifying E2E smoke test artifacts...\n');

// Check 1: playwright-report directory exists
if (!existsSync(REPORT_DIR)) {
  errors.push(`❌ playwright-report/ directory not found at ${REPORT_DIR}`);
} else {
  console.log('✅ playwright-report/ directory exists');
}

// Check 2: test-results directory exists
if (!existsSync(RESULTS_DIR)) {
  errors.push(`❌ test-results/ directory not found at ${RESULTS_DIR}`);
} else {
  console.log('✅ test-results/ directory exists');
}

// Check 3: .last-run.json exists and is valid
if (!existsSync(LAST_RUN_FILE)) {
  errors.push(`❌ test-results/.last-run.json not found (run tests first)`);
} else {
  console.log('✅ test-results/.last-run.json exists');
  
  try {
    const lastRun = JSON.parse(readFileSync(LAST_RUN_FILE, 'utf-8'));
    
    // Check 4: Status is "passed"
    if (lastRun.status === 'passed') {
      console.log('✅ Last run status: PASSED');
    } else {
      errors.push(`❌ Last run status: ${lastRun.status} (expected: passed)`);
    }
    
    // Check 5: No failed tests
    if (!lastRun.failedTests || lastRun.failedTests.length === 0) {
      console.log('✅ No failed tests');
    } else {
      errors.push(`❌ ${lastRun.failedTests.length} test(s) failed:`);
      lastRun.failedTests.forEach((test, i) => {
        errors.push(`   ${i + 1}. ${test}`);
      });
    }
  } catch (e) {
    errors.push(`❌ Failed to parse test-results/.last-run.json: ${e.message}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ ARTIFACT VERIFICATION FAILED\n');
  errors.forEach(err => console.log(err));
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warn => console.log(warn));
  }
  
  console.log('\n📋 Troubleshooting:');
  console.log('  1. Run: npm run e2e:smoke');
  console.log('  2. Check server started: check playwright output');
  console.log('  3. Check env file: tests/.env.e2e.local must exist with Supabase credentials');
  
  process.exit(1);
} else {
  console.log('\n✅ ALL ARTIFACT CHECKS PASSED\n');
  console.log('Ready for deployment! 🚀');
  process.exit(0);
}
