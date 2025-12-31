# E2E Test Runbook

**Last Updated**: 31 December 2025  
**Status**: Ready for Execution  

## Quick Start

### Prerequisites
1. Node.js 18+
2. Supabase account (cloud)
3. Local dev server running: `npm run dev`
4. Playwright installed: `npm install` (already in package.json)

### One-Command Execution
```bash
# Run full E2E suite
npm run e2e

# Run smoke tests only (faster)
npm run e2e:smoke

# Run in headed mode (see browser)
npm run e2e:headed

# Run in UI mode (interactive debugging)
npm run e2e:ui
```

---

## Test Data Strategy

### Test Users

All test accounts created in Supabase Auth:

| Email | Role | Password | Purpose |
|-------|------|----------|---------|
| buyer@ocaso.test | Buyer | Test123!@ | Create & save listings |
| seller@ocaso.test | Seller | Test123!@ | Sell listings, manage shop |
| admin@ocaso.test | Admin | Test123!@ | Admin features (if needed) |

### Test Account Setup

#### Option 1: Manual Creation (First Time)
```bash
# Start dev server
npm run dev

# In another terminal, seed test accounts
node scripts/create-test-user.js

# Or via Supabase dashboard:
# 1. Go to Authentication > Users
# 2. Create: buyer@ocaso.test, seller@ocaso.test, admin@ocaso.test
# 3. Set password: Test123!@
# 4. Confirm email (auto-confirm in dev)
```

#### Option 2: Idempotent Seed Script
```bash
# Creates test users only if they don't exist
npm run seed:test-users
```

### Test Data Fixtures

#### Categories (Seeded)
```
Auto's & Motoren
├─ Auto's
├─ Motoren & Scooters
├─ Campers
└─ Onderdelen & Accessoires

Huis & Inrichting
├─ Meubels
├─ Verlichting
├─ Decoratie
└─ Huishoudtoestellen

... (and 20+ more)
```

#### Vehicle Brands (Seeded)
Cars: Toyota, BMW, Mercedes, Audi, Volkswagen, Ford, Opel...  
Bikes: Trek, Giant, Specialized, Cube...

#### Test Listings (Cleanup After Each Run)
- 5-10 listings per category
- Mix of new & old (for recency tests)
- Cleared before/after tests to avoid pollution

### Seed Execution
```bash
# Seed all test data (categories, brands, listings)
npm run seed:all

# Or individually:
npm run seed:categories
npm run seed:brands
npm run seed:listings
```

---

## Environment Variables

### Required for E2E Tests

Create `.env.local`:
```bash
# Supabase (Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# Test-specific
NEXT_PUBLIC_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=buyer@ocaso.test
TEST_USER_PASSWORD=Test123!@
```

### CI Environment
Via `vercel env pull` or GitHub Actions secrets:
```bash
vercel env pull
```

---

## Playwright Configuration

Location: `playwright.config.ts`

### Key Settings
```typescript
{
  testDir: "./tests/e2e",
  baseURL: "http://localhost:3000",
  fullyParallel: false,           // Sequential for stability
  workers: 1,                      // Single worker
  retries: 0,                      // No retries (deterministic)
  trace: "on-first-retry",        // Capture trace on failure
  screenshot: "only-on-failure",
  video: "retain-on-failure",
}
```

### Projects
- **setup**: Runs `auth.setup.ts` only
  - Generates `tests/.auth/user.json` (storageState)
  - Used by all other tests for pre-auth
- **chromium**: Main test suite (desktop)
- **firefox** (optional): Additional coverage

---

## Authentication Setup

### File: `tests/e2e/auth.setup.ts`

This special test runs ONCE before all other tests:

```typescript
test('authenticate and save storage state', async ({ page }) => {
  // 1. Navigate to /login
  // 2. Enter email + password
  // 3. Click submit
  // 4. Wait for redirect to /profile
  // 5. Save cookies + sessionStorage to tests/.auth/user.json
})
```

### Storage State
- **Location**: `tests/.auth/user.json`
- **Contains**: Auth tokens, sessionStorage, cookies
- **Reused by**: All subsequent tests in the session
- **Lifespan**: Current test run only (recreated each time)

### How It Works

1. Playwright runs `auth.setup.ts` first (project: "setup")
2. Generates `tests/.auth/user.json` with authenticated state
3. Other tests import this state via `use: { storageState: ... }`
4. Tests run with pre-authenticated user
5. No manual login needed in each test

---

## Test Execution Workflow

### Pre-Run Checklist
```bash
# 1. Verify dev server is running
npm run dev  # Terminal 1

# 2. Seed test data (if needed)
npm run seed:all  # Terminal 2

# 3. Run full test suite
npm run e2e  # Terminal 3
```

### What Happens During Test Run

```
1. Playwright loads playwright.config.ts
2. Validates environment (checks SUPABASE_URL, ANON_KEY)
3. Runs auth.setup.ts → logs in, saves storageState
4. Runs test specs in order:
   - a.public-browse.spec.ts
   - b.marketplace-filter.spec.ts
   - c.listing-create.spec.ts
   - ... (rest)
5. Generates playwright-report/ with HTML report
6. Generates test-results/ with XML (for CI)
7. Exits with code 0 (pass) or 1 (fail)
```

### After Failing Test

Playwright saves:
- **Trace**: `trace.zip` (step-by-step video)
- **Screenshot**: `test-failed.png`
- **Video**: `video.webm`

Location: `playwright-report/` (open in browser)

---

## Debugging

### View Test Report
```bash
npx playwright show-report
```

Opens in browser at `http://localhost:9322`

### Run Single Test
```bash
npx playwright test tests/e2e/c.listing-create.spec.ts
```

### Run with Headed Browser
```bash
npm run e2e:headed
```

Browser window stays open; you can inspect live.

### Run in Debug Mode
```bash
npx playwright test --debug
```

Inspector opens; step through code interactively.

### View Traces
```bash
npx playwright show-trace playwright-report/trace.zip
```

Slow-motion playback of test execution.

---

## Correlation IDs

Every test transaction includes a **correlation ID** for tracking:

```typescript
const correlationId = crypto.randomUUID();

// In test:
test('should create listing', async ({ page, context }) => {
  const correlationId = crypto.randomUUID();
  
  // Include in form data
  await page.fill('[name="title"]', 'Test Listing');
  await context.addCookies([{
    name: 'x-correlation-id',
    value: correlationId,
    url: 'http://localhost:3000'
  }]);
  
  // Server logs this ID
  // If test fails, correlation ID shown in error
});
```

### Log Lookup
```bash
# Find logs for correlation ID in Supabase
SELECT * FROM logs WHERE correlation_id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## Cleanup & Teardown

### Automatic Cleanup (End of Test Run)
```typescript
// In fixture cleanup:
afterAll(async () => {
  const supabase = createClient(SERVICE_ROLE_KEY);
  
  // Delete all test listings created during tests
  await supabase
    .from('listings')
    .delete()
    .like('title', '%TEST_%');
  
  // Delete test users if desired
  // (usually keep them for next run)
});
```

### Manual Cleanup (If Needed)
```bash
# Delete test data directly
npm run cleanup:test-data

# Or SQL:
supabase db shell
  DELETE FROM listings WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@ocaso.test'
  );
```

---

## Common Issues & Fixes

### Issue: "Page load timeout"
**Cause**: Dev server not running  
**Fix**: `npm run dev` in separate terminal

### Issue: "Auth failed - invalid credentials"
**Cause**: Test user doesn't exist  
**Fix**: `npm run seed:test-users` or create manually in Supabase UI

### Issue: "Element not found: [data-testid="category-select"]"
**Cause**: App structure changed; test selectors stale  
**Fix**: Update selector in test file & investigate if UI changed

### Issue: "Hydration mismatch"
**Cause**: SSR state doesn't match client state  
**Fix**: Check if server & client render same data (correlation IDs, SSR config)

### Issue: "Test passes locally, fails in CI"
**Cause**: Environment differences (secrets, baseURL, timing)  
**Fix**: Verify `.env.local` matches CI env vars; add `waitFor()` delays

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run e2e:ci
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Run Command in CI
```bash
npm run e2e:ci
```

Differences from local:
- Uses only Chromium (faster)
- 1 worker (sequential)
- 1-2 retries (CI flakiness tolerance)
- GitHub reporter (shows in PR)

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Full E2E suite runtime | < 10 min | TBD |
| Smoke test runtime | < 2 min | TBD |
| Page load (cold) | < 3s | TBD |
| Page load (cache) | < 1s | TBD |
| Login flow | < 5s | TBD |
| Listing creation | < 10s | TBD |

---

## Success Criteria

✅ All tests PASS in 3 consecutive runs  
✅ No console errors in browser  
✅ No network errors (all API calls 200-299)  
✅ Screenshots capture expected UI state  
✅ Correlation IDs logged for traceability  
✅ Cleanup removes all test data  

---

## Support & Escalation

### Questions?
1. Check this runbook
2. Review test comments in `tests/e2e/*.spec.ts`
3. Check Playwright docs: https://playwright.dev/docs/intro
4. Open issue with correlation ID from failed test

### Known Limitations
- Image search (OCR) disabled in E2E (too slow)
- Email verification mocked (no actual emails sent)
- Payment tests use Stripe test keys only
- Mobile tests limited (focus on desktop Chrome)

---

**Next**: Begin PHASE 3 - Playwright Framework & auth.setup.ts validation
