# OCASO Test Documentation

## Overview
This document outlines the comprehensive test suite for OCASO, covering unit tests, E2E tests, and staging readiness validation.

## Test Structure

### Unit Tests (`/tests/`)
- **subscriptions.test.ts**: Tests for subscription entitlements and usage calculations
- **idempotency.test.ts**: Tests for idempotency helpers and webhook processing
- **permissions.test.ts**: Tests for gating helpers and access control

### E2E Tests (`/tests/e2e/`)
- **c2c-flow.spec.ts**: Customer-to-customer flows (signup → listing → chat)
- **b2c-flow.spec.ts**: Business-to-customer flows (seller setup → payments → reviews)
- **admin.spec.ts**: Admin panel functionality and security
- **webhook-idempotency.spec.ts**: Webhook replay and payment idempotency
- **concurrency.spec.ts**: Concurrent operations and atomicity tests

## Test Categories

### 1. Build Gates ✅
- TypeScript compilation (0 errors)
- ESLint (no errors)
- Build succeeds
- All dependencies resolved

### 2. Unit Tests ✅
- **Subscriptions**: Entitlement calculation, usage tracking, plan limits
- **Idempotency**: Same input produces same output, webhook replay protection
- **Permissions**: Access control, gating helpers, enforcement functions

### 3. E2E Tests (Playwright)
- **C2C Flow**: Complete user journey from registration to chat
- **B2C Flow**: Business seller setup, payments, reviews, subscriptions
- **Admin Panel**: Dashboard access, user management, content moderation
- **Security**: Access control, authentication flows

### 4. Critical Path Validation
- **Authentication**: Signup, login, logout, session management
- **Marketplace**: Browse, search, filter, listing display
- **Seller Flow**: Listing creation, editing, management
- **Payments**: Stripe integration, webhook processing, error handling
- **Chat**: Real-time messaging, conversation management
- **Admin**: User moderation, analytics, system management

### 5. Idempotency & Concurrency
- **Webhook Replay**: Duplicate webhook handling
- **Payment Processing**: Concurrent payment attempts
- **Resource Limits**: Atomic operations under load

## Test Execution

### Prerequisites
```bash
npm install
npm run build
```

### Running Tests

#### Unit Tests
```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- tests/subscriptions.test.ts

# Run with coverage
npm run test:coverage
```

#### E2E Tests
```bash
# Run all E2E tests
npm run e2e

# Run E2E tests in UI mode
npm run e2e:ui

# Run specific E2E test
npx playwright test tests/e2e/c2c-flow.spec.ts
```

#### CI Pipeline
```bash
# Full CI pipeline (build + test + e2e)
npm run ci
```

### Test Environments

#### Local Development
- Uses local Next.js dev server
- Test database (separate from production)
- Mock external services where possible

#### Staging
- Full staging environment
- Real database (staging)
- Real Stripe test mode
- Real Supabase staging instance

#### Production
- Smoke tests only
- Non-destructive operations
- Monitoring and alerting validation

## Test Data Management

### Test Users
- Generated with unique timestamps
- Automatic cleanup where possible
- Isolated test data to prevent conflicts

### Database State
- Tests assume clean initial state
- No dependencies between test runs
- Rollback mechanisms for failed tests

### External Services
- Stripe: Test mode with predefined cards
- Supabase: Test database with fixtures
- Email: Mocked in tests

## Critical Business Logic Coverage

### 1. Subscription System
- ✅ Plan entitlements calculation
- ✅ Usage tracking and limits
- ✅ Upgrade/downgrade flows
- ✅ Feature gating

### 2. Payment Processing
- ✅ Stripe webhook handling
- ✅ Idempotency protection
- ✅ Error recovery
- ✅ Refund processing

### 3. Access Control
- ✅ User role validation
- ✅ Organization permissions
- ✅ Feature entitlements
- ✅ Admin access control

### 4. Marketplace Operations
- ✅ Listing creation and validation
- ✅ Search and filtering
- ✅ Boost functionality
- ✅ Review system

## Performance Benchmarks

### Test Execution Times
- Unit tests: < 5 seconds
- E2E tests: < 10 minutes
- Full CI pipeline: < 15 minutes

### Concurrency Handling
- Database connection pooling
- Race condition prevention
- Atomic operations validation

## Monitoring & Alerting

### Test Failure Handling
- Immediate notification on failures
- Screenshot capture for E2E failures
- Detailed error logging
- Automatic retry mechanisms

### Coverage Requirements
- Unit tests: > 80% coverage
- Critical paths: 100% E2E coverage
- Error scenarios: Comprehensive coverage

## Go-Live Checklist

### Pre-Launch Validation
- [ ] All build gates green
- [ ] Unit test coverage > 80%
- [ ] E2E tests passing in staging
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Load testing completed

### Production Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Business metrics tracking
- [ ] Automated rollback procedures

## Troubleshooting

### Common Issues
1. **Database connection timeouts**: Check connection pooling
2. **Stripe webhook failures**: Verify webhook endpoints
3. **Race conditions**: Implement proper locking mechanisms
4. **Test data conflicts**: Use unique identifiers

### Debug Mode
```bash
# Run tests with debug output
DEBUG=true npm test

# Run E2E with browser visible
npx playwright test --headed
```

## Future Enhancements

### Planned Improvements
- Visual regression testing
- API contract testing
- Performance regression testing
- Chaos engineering scenarios
- Multi-region deployment testing

### Test Automation
- GitHub Actions integration
- Automated test data generation
- Smart test selection based on changes
- Parallel test execution optimization
