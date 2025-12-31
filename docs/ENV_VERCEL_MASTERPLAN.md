# Environment Variables Masterplan (Vercel Deployment)

**Date**: 31 December 2025  
**Status**: Configuration Ready  
**Scope**: All production, staging, and development environments  

---

## Quick Reference: All Required Variables

| Variable | Required | Scope | Purpose | Example |
|----------|----------|-------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Client+Server | Supabase API endpoint | `https://dmnowaqinfkhovhyztan.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client+Server | Anonymous client key (public) | `eyJ...` (JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server Only | Admin key (NEVER expose) | `sb_secret_...` |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Client+Server | App canonical URL | `https://ocaso.nl` or `http://localhost:3000` |
| `NEXT_PUBLIC_AFFILIATE_ENABLED` | ⚠️ | Client+Server | Feature flag: affiliate program | `true` or `false` |
| `NEXT_PUBLIC_BUSINESS_GATING_ENABLED` | ⚠️ | Client+Server | Feature flag: business accounts | `true` or `false` |
| `STRIPE_SECRET_KEY` | ✅ | Server Only | Stripe payment processing | `sk_live_...` or `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | ✅ | Client+Server | Stripe frontend key | `pk_live_...` or `pk_test_...` |
| `SENDCLOUD_PUBLIC_KEY` | ⚠️ | Server Only | Shipping integration | `key...` |
| `SENDCLOUD_SECRET_KEY` | ⚠️ | Server Only | Shipping integration | `secret...` |
| `IMAGE_SEARCH_EMBEDDINGS_ENABLED` | ⚠️ | Server Only | ML image search feature | `0` or `1` |
| `IMAGE_SEARCH_OCR_ENABLED` | ⚠️ | Server Only | Text recognition in images | `0` or `1` |
| `IMAGE_SEARCH_URL` | ⚠️ | Server Only | Image search API endpoint | `http://localhost:9000/search` |
| `IMAGE_SEARCH_TEXT_URL` | ⚠️ | Server Only | Text search API endpoint | `http://localhost:9000/search-text` |
| `IMAGE_SEARCH_EMBEDDING_MAX_DIST` | ⚠️ | Server Only | Similarity threshold | `0.30` |
| `NEXT_PUBLIC_ENABLE_OAUTH` | ⚠️ | Client+Server | OAuth social login | `true` or `false` |
| `NODE_ENV` | ✅ | Both | Environment mode | `production`, `staging`, or `development` |

**Legend**:  
✅ = Critical (must be set)  
⚠️ = Optional (defaults provided if missing)  

---

## Environment-Specific Configurations

### Production (Vercel - main branch)

**When to use**: Live user traffic  
**Set via**: `vercel env add` with scope `production`

```bash
# Supabase (Production Database)
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# App Config
NEXT_PUBLIC_BASE_URL=https://ocaso.nl
NODE_ENV=production

# Payment (Stripe Live Keys)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...

# Features
NEXT_PUBLIC_AFFILIATE_ENABLED=true
NEXT_PUBLIC_BUSINESS_GATING_ENABLED=true

# Optional: Shipping
SENDCLOUD_PUBLIC_KEY=prod_key_...
SENDCLOUD_SECRET_KEY=prod_secret_...
```

**Verification**:
```bash
vercel env ls --environment=production | grep SUPABASE
```

### Staging (Vercel - staging branch)

**When to use**: Pre-release testing  
**Set via**: `vercel env add` with scope `preview` + filter by `staging` branch

```bash
# Supabase (Staging Database - optional separate instance)
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co  # Can reuse prod if no staging DB
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# App Config
NEXT_PUBLIC_BASE_URL=https://staging.ocaso.nl
NODE_ENV=production  # Still production build, just different URL

# Payment (Stripe Test Keys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...

# Features
NEXT_PUBLIC_AFFILIATE_ENABLED=true
NEXT_PUBLIC_BUSINESS_GATING_ENABLED=true
```

### Development (Local)

**When to use**: Local development & E2E testing  
**Set via**: `.env.local` (Git-ignored)

```bash
# .env.local (GIT-IGNORED - never commit)
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Development URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Payment (Stripe Test Keys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...

# Image Search (disabled for dev speed)
IMAGE_SEARCH_EMBEDDINGS_ENABLED=0
IMAGE_SEARCH_OCR_ENABLED=0

# Features - enable all in dev
NEXT_PUBLIC_AFFILIATE_ENABLED=true
NEXT_PUBLIC_BUSINESS_GATING_ENABLED=true
```

### E2E Testing (Playwright)

**When to use**: Automated test environment  
**Location**: `tests/.env.e2e.local` (Git-ignored)

```bash
# tests/.env.e2e.local (GIT-IGNORED)
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Test account credentials
E2E_TEST_EMAIL=test-user@ocaso-test.local
E2E_TEST_PASSWORD=TestPassword123!

# Features enabled for test coverage
NEXT_PUBLIC_AFFILIATE_ENABLED=true
NEXT_PUBLIC_BUSINESS_GATING_ENABLED=true

# Image search disabled for speed
IMAGE_SEARCH_EMBEDDINGS_ENABLED=0
IMAGE_SEARCH_OCR_ENABLED=0
```

---

## Variable Details & Usage

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type**: URL
- **Scope**: Client + Server
- **Required**: ✅ Yes
- **Where used**:
  - `lib/supabaseClient.ts` - Client-side Supabase instance
  - `middleware.ts` - Authentication middleware
  - `playwright.config.ts` - E2E test validation
- **How to find**:
  ```bash
  supabase projects list
  # → Copy "Reference ID" column value and prepend: https://{ref}.supabase.co
  ```

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type**: JWT String
- **Scope**: Client + Server  
- **Required**: ✅ Yes
- **Where used**:
  - `lib/supabaseClient.ts` - Public API access
  - Browser local storage (auto-managed by Supabase SDK)
  - Playwright E2E tests
- **How to find**:
  ```bash
  supabase projects list
  # → Click project → Settings → API Keys → Copy "anon public" key
  ```
- **Security Note**: Public by design, safe to expose in client code

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type**: JWT String (with service_role)
- **Scope**: **Server Only** (❌ NEVER client)
- **Required**: ✅ Yes
- **Where used**:
  - `lib/supabaseServer.ts` - Server-side admin operations
  - `app/api/*/route.ts` - API routes
  - Database migrations (Supabase CLI)
  - E2E test setup/teardown only
- **How to find**:
  ```bash
  supabase projects list
  # → Click project → Settings → API Keys → Copy "service_role" key
  ```
- **Security Note**: ⚠️ **CRITICAL** - Never expose in client code or logs
  - If compromised, regenerate immediately
  - Rotate regularly in production

### Payment Configuration

#### `STRIPE_SECRET_KEY`
- **Type**: String (sk_live_... or sk_test_...)
- **Scope**: Server Only
- **Required**: ✅ Yes (if payments enabled)
- **Where used**:
  - `app/api/payments/route.ts` - Payment processing
  - `lib/stripe.ts` - Stripe client initialization
- **Environments**:
  - Production: `sk_live_...`
  - Staging/Dev: `sk_test_...`
- **How to find**:
  - Stripe Dashboard → Developers → API Keys → Secret Key

#### `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- **Type**: String (pk_live_... or pk_test_...)
- **Scope**: Client + Server
- **Required**: ✅ Yes (if payments enabled)
- **Where used**:
  - `components/CheckoutForm.tsx` - Payment form
  - `@stripe/react-stripe-js` SDK
- **Environments**:
  - Production: `pk_live_...`
  - Staging/Dev: `pk_test_...`

### Feature Flags

#### `NEXT_PUBLIC_AFFILIATE_ENABLED`
- **Type**: Boolean (`true` or `false`)
- **Scope**: Client + Server
- **Default**: `true` (if not set)
- **Where used**:
  - `app/affiliate/*` - Affiliate dashboard & features
  - `components/AffiliateRecommendations.tsx`
  - `lib/domain/gating.ts`
- **Example**:
  ```typescript
  if (process.env.NEXT_PUBLIC_AFFILIATE_ENABLED === 'true') {
    // Show affiliate features
  }
  ```

#### `NEXT_PUBLIC_BUSINESS_GATING_ENABLED`
- **Type**: Boolean (`true` or `false`)
- **Scope**: Client + Server
- **Default**: `true` (if not set)
- **Where used**:
  - `app/business/*` - Business features
  - `middleware.ts` - Route gating
  - Subscription validation

### Image Search Configuration

#### `IMAGE_SEARCH_EMBEDDINGS_ENABLED`
- **Type**: Number (0 or 1)
- **Scope**: Server Only
- **Default**: `1` (enabled)
- **Where used**:
  - `app/api/search/image` - Image embeddings processing
  - `lib/ml/embeddings.ts`
- **Note**: Disable (0) in E2E tests for speed

#### `IMAGE_SEARCH_OCR_ENABLED`
- **Type**: Number (0 or 1)
- **Scope**: Server Only
- **Default**: `0` (disabled)
- **Where used**:
  - `app/api/search/image` - Text extraction from images
  - `lib/ml/ocr.ts`
- **Performance**: High cost operation, disable in tests

#### `IMAGE_SEARCH_URL`
- **Type**: URL
- **Scope**: Server Only
- **Default**: `http://localhost:9000/search`
- **Where used**: ML service endpoint for image similarity search

---

## How to Set Variables in Vercel

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Add variable (interactive)
vercel env add NEXT_PUBLIC_SUPABASE_URL
# → Enter value
# → Select scope: production, preview, development
# → Confirm

# List all variables
vercel env ls

# Pull from Vercel to local .env.local
vercel env pull

# Remove variable
vercel env rm VARIABLE_NAME
```

### Method 2: Vercel Dashboard

1. Go to: https://vercel.com/dashboard/ocaso-portal/settings/environment-variables
2. Click "Add New"
3. Fill in:
   - **Name**: Variable name
   - **Value**: Secret value
   - **Scope**: production / preview / development
   - **Environments**: Select affected branches
4. Click "Save"

### Method 3: GitHub Actions (CI/CD)

Variables stored in Vercel are automatically available in CI/CD builds.  
No additional setup needed for GitHub Actions.

---

## Validation Checklist

Before deploying to production:

### Pre-Deployment Verification
```bash
# 1. Verify all required vars are set
vercel env ls | grep -E "SUPABASE|STRIPE|SENDCLOUD"

# 2. Pull current config to .env.local
vercel env pull

# 3. Run type check (catches missing env refs)
npm run typecheck

# 4. Run lint
npm run lint

# 5. Build locally
npm run build

# 6. Health check
npm run dev &
sleep 3
curl http://localhost:3000/api/health/supabase
# Should return 200 + JSON
```

### Post-Deployment Verification
```bash
# 1. Visit deployed URL
# https://ocaso.vercel.app (preview) or https://ocaso.nl (prod)

# 2. Check Network tab (inspect element)
# Verify Supabase requests to correct domain
# Network → Filter by "supabase" → should show dmnowaqinfkhovhyztan.supabase.co

# 3. Auth test
# Navigate to /login → Should connect to correct Supabase
# Check Network for auth requests

# 4. Error check
# Console → Should have no errors
# Errors may indicate missing env vars or misconfiguration
```

---

## Troubleshooting

### Issue: "Cannot read property of undefined" or 404s
**Probable Cause**: Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Fix**:
```bash
vercel env ls | grep SUPABASE
# Should show both URLs and keys

# If missing, add:
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

### Issue: Auth fails with "Invalid API key"
**Probable Cause**: Wrong Supabase key or wrong project referenced

**Fix**:
```bash
# Verify project reference
supabase projects list
# Copy correct reference ID

# Verify anon key matches
supabase projects list --json | jq '.[] | {name, ref}'
```

### Issue: Stripe payments fail
**Probable Cause**: Using test keys in production or vice versa

**Fix**:
```bash
# For production:
# Use sk_live_... and pk_live_... keys

# For staging/dev:
# Use sk_test_... and pk_test_... keys

# Check current setting:
vercel env ls | grep STRIPE
```

### Issue: Payment form not loading ("Stripe not defined")
**Probable Cause**: `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` missing from client scope

**Fix**:
```bash
# Must have NEXT_PUBLIC_ prefix (public key)
vercel env ls | grep STRIPE_PUBLIC
# Should show pk_... key

# Re-add if missing:
vercel env add NEXT_PUBLIC_STRIPE_PUBLIC_KEY
```

---

## Security Best Practices

✅ **DO**:
- Use service role key ONLY in `lib/supabaseServer.ts` and API routes
- Rotate keys quarterly
- Use Vercel secrets for all sensitive vars
- Keep `.env.local` in `.gitignore`
- Use `NEXT_PUBLIC_` prefix ONLY for client-safe variables
- Store stripe_secret in server-only files

❌ **DON'T**:
- Commit `.env.local` or `.env.*.local` files
- Pass `SUPABASE_SERVICE_ROLE_KEY` to client components
- Log secrets to console (even in dev)
- Use same keys for prod and staging
- Hardcode URLs or keys in code
- Expose service role key in error messages

---

## Rotation Schedule

| Key | Rotation Frequency | Next Rotation | Owner |
|-----|-------------------|---------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Quarterly | 31 Mar 2026 | CTO |
| `STRIPE_SECRET_KEY` | Quarterly | 31 Mar 2026 | Payments Lead |
| `SENDCLOUD_SECRET_KEY` | Yearly | 31 Dec 2026 | Operations |
| `NEXT_PUBLIC_*` keys | Only if compromised | N/A | DevOps |

---

## Deployment Commands

### Deploy with environment check
```bash
# 1. Verify all vars set
npm run build

# 2. Deploy to staging
vercel --env-scope=preview

# 3. Deploy to production
vercel --prod
```

### Rollback if needed
```bash
# If deployment fails due to env vars:
# 1. Revert in Vercel dashboard
# 2. Or re-run deploy:
vercel --prod --force
```

---

## Summary for Developers

1. **Local Development**:
   - Copy `.env.example` → `.env.local`
   - Fill in Supabase & Stripe test keys
   - Never commit `.env.local`

2. **Vercel Staging/Prod**:
   - Use `vercel env add` to set secrets
   - Vercel automatically injects on deploy
   - Use `vercel env pull` to sync locally

3. **Emergency Cleanup**:
   - If key leaked: Regenerate in Supabase/Stripe dashboard immediately
   - Update in Vercel within 10 minutes
   - Monitor logs for suspicious activity

---

**Next Step**: PHASE 7 - Create final audit report and go-live checklist

