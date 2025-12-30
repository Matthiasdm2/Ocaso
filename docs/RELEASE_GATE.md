# RELEASE GATE: E2E Smoke Test Verification

**Last Updated**: 30 December 2025  
**Status**: ✅ Operational  
**Current Version**: Ocaso Rewrite (Main Branch)

---

## 🎯 SINGLE COMMAND BEFORE DEPLOY

```bash
npm run e2e:smoke:verify
```

This command:
1. ✅ Starts Next.js dev server automatically
2. ✅ Runs complete smoke test suite (23 tests)
3. ✅ Verifies all artifacts exist
4. ✅ Confirms deployment readiness

**Expected Result**: 
```
✅ ALL ARTIFACT CHECKS PASSED
Ready for deployment! 🚀
```

---

## 📋 EXPECTED TEST RESULTS

### Test Count
- **Total**: 23 tests
- **Expected Pass**: 23
- **Expected Fail**: 0

### Test Suite Breakdown
```
smoke.affiliate.spec.ts        ✅ 6 tests
smoke.auth.spec.ts             ✅ 5 tests
smoke.business-gating.spec.ts  ✅ 3 tests
smoke.loggedin.spec.ts         ✅ 5 tests
smoke.spec.ts                  ✅ 4 tests
─────────────────────────────────────
TOTAL                          ✅ 23 tests
```

### Artifacts Checklist
- ✅ `playwright-report/index.html` - HTML report
- ✅ `test-results/.last-run.json` - Test metadata
- ✅ `test-results/` - Individual test results

---

## ✅ GO/NO-GO CRITERIA

### GO Conditions (All Must Pass)
| Criterion | Requirement | How to Verify |
|-----------|-------------|---------------|
| Server Starts | Next.js ready in < 120s | Check webServer logs |
| Test Suite Runs | All 23 tests execute | Check test-results/.last-run.json |
| All Tests Pass | status: "passed" | Check test-results/.last-run.json |
| No Failed Tests | failedTests: [] | Check test-results/.last-run.json |
| Affiliate Feature | 6/6 tests pass | Search output for "smoke.affiliate" |
| Auth Flows | Login/register working | Check smoke.auth tests pass |
| Business Gating | Business restrictions enforced | Check smoke.business-gating tests pass |
| Artifacts Exist | All report files present | Run scripts/verify-smoke-artifacts.mjs |

### Result: GO/NO-GO Decision
```
If ALL criteria pass → GO FOR DEPLOYMENT ✅
If ANY criterion fails → NO-GO, fix issues first ❌
```

---

## 🔧 LOCAL TESTING

### Before You Deploy

```bash
# 1. Run complete verification
npm run e2e:smoke:verify

# 2. Check output for "Ready for deployment! 🚀"

# 3. View detailed report (optional)
open playwright-report/index.html
```

### For Development/Debugging

```bash
# Run smoke tests only (no artifact verification)
npm run e2e:smoke

# Run with browser UI
npm run e2e:ui

# Run with visible browser window
npm run e2e:headed

# Run all E2E tests (not just smoke)
npm run e2e
```

---

## ⚙️ ENVIRONMENT SETUP

### Required File: `tests/.env.e2e.local`

Create this file with:
```bash
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_key>
NEXT_PUBLIC_AFFILIATE_ENABLED=true
```

### Environment Guards

Playwright automatically validates:
- ✅ NEXT_PUBLIC_SUPABASE_URL must be set
- ✅ NEXT_PUBLIC_SUPABASE_URL must not be localhost:8000
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY must be set

If validation fails, tests will **FAIL FAST** with clear error.

---

## 🚀 CI/CD DEPLOYMENT

### GitHub Actions Integration

Workflow: `.github/workflows/e2e-smoke.yml`

**Trigger**: 
- Every push to `main` or `staging`
- Every pull request to `main` or `staging`

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Create `.env.e2e.local` from GitHub Secrets
5. Run `npm run e2e:smoke:ci` (1 retry allowed)
6. Verify artifacts
7. Upload playwright-report and test-results
8. Comment on PR with results

**GitHub Secrets Required**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_AFFILIATE_ENABLED (optional, defaults to 'true')
```

---

## 🔍 TROUBLESHOOTING

### Error: "ERR_CONNECTION_REFUSED"
**Cause**: Server not starting
**Solution**:
1. Check `npm run dev` works locally: `npm run dev`
2. Verify port 3000 is free: `lsof -i :3000`
3. Check webServer.timeout in playwright.config.ts (should be 120000ms)
4. Check logs for build errors

### Error: "NEXT_PUBLIC_SUPABASE_URL is not set"
**Cause**: Missing `tests/.env.e2e.local` file
**Solution**:
1. Create `tests/.env.e2e.local` with required vars
2. Copy from `.env.local` if in doubt
3. Verify file is not in `.gitignore` (it should be!)

### Error: "Unauthorized" on affiliate API calls
**Cause**: API requires authentication (CORRECT BEHAVIOR)
**Solution**:
- Affiliate tests are designed to handle 401 Unauthorized
- This is expected and not a failure
- Tests verify response schema is correct, not success

### Error: "Profile save failed"
**Cause**: Supabase service role key invalid
**Solution**:
1. Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct in tests/.env.e2e.local
2. Ensure Supabase project is accessible
3. Check auth status on test user account

### Tests Timeout After 30 Seconds
**Cause**: Playwright waiting for server that doesn't respond
**Solution**:
1. Check if server is actually running: `curl http://localhost:3000`
2. If not running, check for compilation errors
3. Increase webServer.timeout if needed (currently 120000ms)

---

## 📊 TEST INFRASTRUCTURE

### Playwright Configuration

**File**: `playwright.config.ts`

Key Settings:
```typescript
webServer: {
  command: 'npm run dev -- --port 3000',
  url: 'http://localhost:3000',
  timeout: 120 * 1000,      // 120 seconds
  reuseExistingServer: true, // Reuse if already running
  stdout: 'pipe',            // Show server logs
  stderr: 'pipe',            // Show server errors
}

use: {
  baseURL: "http://localhost:3000",  // CANONICAL (no fallback)
  trace: "on-first-retry",           // Trace on failures
  screenshot: "only-on-failure",     // Screenshots for debugging
  video: "retain-on-failure",        // Videos for debugging
}
```

### npm Scripts

```json
{
  "e2e:smoke": "playwright test tests/e2e/smoke*.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line",
  "e2e:smoke:ci": "playwright test tests/e2e/smoke*.spec.ts --project=chromium --workers=1 --retries=1 --reporter=github,line",
  "e2e:smoke:verify": "npm run e2e:smoke && node scripts/verify-smoke-artifacts.mjs"
}
```

---

## 📈 RELEASE DECISION FLOW

```
START: npm run e2e:smoke:verify
  ↓
[Playwright starts Next.js server]
  ↓
[Server compiles and ready]
  ↓
[Run 23 smoke tests]
  ↓
[All tests pass? YES → ✅ PASS / NO → ❌ FAIL]
  ↓
[Verify artifacts exist]
  ↓
[Check status in .last-run.json]
  ↓
[status = "passed"? YES → ✅ GO / NO → ❌ NO-GO]
  ↓
END: Ready for deployment or fix issues
```

---

## 🔐 SECURITY NOTES

- ✅ `tests/.env.e2e.local` is in `.gitignore` (never commit secrets)
- ✅ GitHub Secrets used for CI (never stored in repo)
- ✅ Playwright doesn't expose credentials in logs
- ✅ Test database is isolated from production

---

## 📞 SUPPORT

### Quick Reference
- **Run before deploy**: `npm run e2e:smoke:verify`
- **View report**: `open playwright-report/index.html`
- **Check server**: `curl http://localhost:3000`
- **Check env**: `cat tests/.env.e2e.local` (only vars, no values)

### Common Commands
```bash
# Full verification (recommended)
npm run e2e:smoke:verify

# Smoke tests only
npm run e2e:smoke

# With UI
npm run e2e:ui

# With browser
npm run e2e:headed

# Specific test file
npx playwright test tests/e2e/smoke.affiliate.spec.ts --ui
```

---

## ✅ APPROVAL SIGNATURE

**Release Gate Operational**: ✅ YES  
**Last Verified**: 30 December 2025  
**Next Review**: Before each production deployment  
**Owner**: Release Gatekeeper (GitHub Copilot)

**Status**: APPROVED FOR USE 🚀

---

**Remember**: Always run `npm run e2e:smoke:verify` before deploying to production!
