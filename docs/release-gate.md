# Release Gate Criteria

## Overview
This document outlines the automated and manual checks that must pass before deploying to production. The goal is to ensure deterministic test stability with 0 flakes across multiple runs.

## Automated Release Gates

### 1. Code Quality Gates
- **TypeScript Compilation**: `npm run typecheck` passes
- **Linting**: `npm run lint` passes
- **Formatting**: `npm run format:check` passes
- **Build**: `npm run build` completes successfully

### 2. E2E Test Stability
- **Local Stability**: 10 consecutive runs of `npm run e2e` pass with 0 flakes
- **CI Stability**: 3 consecutive CI runs of `npm run e2e:ci` pass with 0 flakes
- **Smoke Tests**: `npm run e2e:smoke` passes in CI environment

## Manual Go/No-Go Checklist

### Pre-Release Verification
- [ ] All automated gates pass
- [ ] No critical security issues in latest SonarQube scan
- [ ] Database migrations tested in staging
- [ ] Performance benchmarks meet requirements
- [ ] Manual smoke test of P0 flows completed

### Go Criteria
- ✅ All automated tests pass with 0 flakes
- ✅ No new critical security vulnerabilities
- ✅ Performance regression < 5%
- ✅ Manual testing confirms P0 flows work
- ✅ Database migrations applied successfully in staging

### No-Go Criteria
- ❌ Any E2E test flakes in CI
- ❌ Critical security vulnerabilities introduced
- ❌ Performance regression > 10%
- ❌ P0 flows broken in manual testing
- ❌ Database migration failures

## Test Failure Classification

### Acceptable Failures (Go)
- Infrastructure timeouts (retry fixes applied)
- Network connectivity issues (retries implemented)
- Test data collisions (isolation implemented)

### Unacceptable Failures (No-Go)
- Application code bugs
- Authentication failures
- Critical path regressions
- Security vulnerabilities

## Rollback Plan
If deployment fails post-release:
1. Immediate rollback to previous version
2. Root cause analysis within 4 hours
3. Fix verification in staging before re-release
4. Communicate incident to stakeholders

## Monitoring Post-Release
- Application performance metrics
- Error rates and user impact
- E2E health checks every 15 minutes
- Alert on >5% error rate increase
