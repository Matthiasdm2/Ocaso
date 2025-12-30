#!/bin/bash

# OCASO Staging Deployment Script
# This script deploys to Vercel staging and runs release gates

set -e

echo "🚀 Starting OCASO Staging Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vercel.json" ]; then
    print_error "Not in OCASO project directory"
    exit 1
fi

# Run release gates locally first
echo "🔍 Running Release Gates (Local)..."

echo "  → TypeScript check..."
if npm run typecheck; then
    print_status "TypeScript check passed"
else
    print_error "TypeScript check failed"
    exit 1
fi

echo "  → ESLint check..."
if npm run lint; then
    print_status "ESLint check passed"
else
    print_error "ESLint check failed"
    exit 1
fi

echo "  → Build check..."
if npm run build; then
    print_status "Build check passed"
else
    print_error "Build check failed"
    exit 1
fi

print_status "All release gates passed locally"

# Deploy to Vercel staging
echo "📦 Deploying to Vercel Staging..."
if npm run staging:deploy; then
    print_status "Deployed to Vercel staging"
else
    print_error "Vercel deployment failed"
    exit 1
fi

# Wait for deployment to be ready
echo "⏳ Waiting for staging deployment to be ready..."
sleep 30

# Check staging health
echo "🏥 Checking staging health..."
if npm run staging:health; then
    print_status "Staging health check passed"
else
    print_error "Staging health check failed"
    exit 1
fi

# Run E2E tests against staging
echo "🧪 Running E2E tests against staging..."
if npm run staging:smoke-test; then
    print_status "E2E tests passed on staging"
else
    print_error "E2E tests failed on staging"
    exit 1
fi

print_status "🎉 Staging deployment completed successfully!"
echo ""
echo "Staging URL: https://ocaso-staging.vercel.app"
echo "Run 'npm run e2e:staging' to run tests manually"
echo "Run 'npm run staging:health' to check health"
