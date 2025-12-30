# OCASO Release Runbook

## Overview
This runbook provides step-by-step instructions for deploying OCASO to staging and production environments.

## Prerequisites
- Vercel CLI installed and authenticated
- Access to Vercel project `ocaso`
- Supabase project access
- Stripe dashboard access (test mode)
- All environment variables configured

## Staging Deployment

### Automated Deployment (Recommended)
```bash
npm run staging:deploy-full
```

**Expected Output:**
```
🚀 Starting OCASO Staging Deployment
🔍 Running Release Gates (Local)...
  → TypeScript check...
✅ TypeScript check passed
  → ESLint check...
✅ ESLint check passed
  → Build check...
✅ Build check passed
✅ All release gates passed locally
📦 Deploying to Vercel Staging...
✅ Deployed to Vercel staging
⏳ Waiting for staging deployment to be ready...
🏥 Checking staging health...
✅ Staging health check passed
🧪 Running E2E tests against staging...
✅ E2E tests passed on staging
🎉 Staging deployment completed successfully!

Staging URL: https://ocaso-staging.vercel.app
```

### Manual Deployment Steps

#### 1. Run Release Gates Locally
```bash
npm run typecheck
```
**Expected:** No TypeScript errors, clean exit code 0

```bash
npm run lint
```
**Expected:** No ESLint errors or warnings, clean exit code 0

```bash
npm run build
```
**Expected:** Successful build output ending with "✓ Ready in Xms"

#### 2. Deploy to Vercel Staging
```bash
npm run staging:deploy
```
**Expected:** Vercel deployment URL printed, e.g., "https://ocaso-[hash].vercel.app"

#### 3. Verify Staging Deployment
```bash
npm run staging:health
```
**Expected:** JSON response with database connection status

#### 4. Run Smoke Tests
```bash
npm run e2e:staging
```
**Expected:** All 5 smoke tests pass:
- ✓ auth flow works - register/login/logout
- ✓ explore page loads and search works
- ✓ C2C flow - create and view listing
- ✓ credits system works
- ✓ admin access is protected

## Production Deployment

### Prerequisites for Production
- [ ] All staging tests pass (Go/No-Go checklist complete)
- [ ] Production environment variables configured in Vercel
- [ ] Database migrations tested on staging
- [ ] Stripe webhooks configured for live mode
- [ ] DNS configured for production domain

### Production Deployment Steps
```bash
# Deploy to production (main branch)
vercel --prod

# Or push to main branch (triggers automatic deployment)
git push origin main
```

**Expected Output:**
- Vercel deployment URL: https://ocaso.be (or configured production domain)
- Build completes successfully
- All environment variables applied

### Post-Deployment Verification
```bash
# Health check
curl -s https://ocaso.be/api/health/supabase

# Smoke test (manual verification)
# 1. Visit https://ocaso.be
# 2. Register a test user
# 3. Create a listing
# 4. Verify marketplace shows listing
# 5. Test login/logout flow
```

## Rollback Procedures

### Immediate Rollback (Vercel)
```bash
# Rollback to previous deployment
vercel rollback
```

### Emergency Rollback
1. Identify last known good commit
2. Deploy specific commit to production:
```bash
vercel --prod --commit-sha <good-commit-hash>
```

## Monitoring & Alerts

### Health Checks
- Vercel deployment status
- Supabase database connectivity
- Stripe webhook delivery
- Application error logs

### Key Metrics to Monitor
- Response times < 3 seconds
- Error rate < 1%
- Successful user registrations
- Successful listing creations
- Payment processing success rate

## Environment Variables Reference

### Staging (.env.staging)
```
NEXT_PUBLIC_SITE_URL=https://ocaso-staging.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://dmnowaqinfkhovhyztan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production (Vercel Environment Variables)
Same as staging but with production values and live Stripe keys.

## Troubleshooting

### Common Issues

**Build Fails:**
- Check TypeScript errors: `npm run typecheck`
- Check ESLint: `npm run lint`
- Verify environment variables are set

**Tests Fail:**
- Check staging URL is accessible
- Verify environment variables in Vercel
- Check Supabase connectivity

**Deployment Hangs:**
- Check Vercel dashboard for build logs
- Verify all required environment variables are set
- Check for circular dependencies

### Support Contacts
- Development: [contact]
- Infrastructure: [contact]
- Product: [contact]
