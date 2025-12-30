# Business Onboarding Gating Implementation

## Overview
Implemented subscription-based gating for business shop fields. Users must activate a paid subscription before accessing shop management features (branding, shop details, bulk uploads, etc.).

## Features Implemented

### 1. **UI Gating** ✅
- **Subscription Section Always Visible**: Users see subscription plans when they activate business mode
- **Shop Fields Hidden Until Subscription Active**: All shop management sections conditionally render only when `profile.business.subscriptionActive === true`
- **CTA Message**: Clear call-to-action message prompts users to activate subscription when it's not active
- **Scroll to Subscriptions**: Button allows users to easily navigate to subscription options

### 2. **Server-Side Enforcement** ✅
- **New Endpoint**: `/api/profile/business/upsert` (PUT)
- **Subscription Check**: Validates `business.subscription_active` from database before allowing updates
- **403 Forbidden Response**: Returns 403 with descriptive error message if subscription not active
- **Security**: Uses service role client to safely check subscription status
- **Column Whitelisting**: Only allows specific business/shop columns to be updated

### 3. **Client-Side Integration** ✅
- **Updated Save Function**: Modified `save()` function to call new subscription-enforced endpoint
- **Auth Token Handling**: Passes bearer token for proper user authentication
- **Error Handling**: Displays specific 403 error message to users explaining they need active subscription
- **User Feedback**: Shows success/error messages appropriately

### 4. **Playwright Tests** ✅
- **Test 1**: Verifies subscription section visible, shop fields hidden until subscription active
- **Test 2**: Confirms API returns 403 when attempting to save shop data without subscription
- **Test 3**: Validates shop fields become visible and editable after subscription is active

## File Changes

### Modified Files:
1. **`app/profile/(tabs)/business/page.tsx`**
   - Added conditional rendering for all shop field sections
   - Wrapped sections with: `{profile.business?.subscriptionActive && ( ... )}`
   - Added CTA section when subscription not active
   - Updated `save()` function to call new subscription-enforced endpoint
   - Sections affected:
     - Branding (Logo & banner)
     - Categories selection
     - Winkelgegevens (Shop details)
     - Eigen betaalterminal (Payment terminal)
     - Zichtbaarheid (Visibility/Contact)
     - Socials (Social media links)
     - Wettelijk (Legal/Business data)
     - Facturatie (Invoicing)
     - Bulk upload

### Created Files:
1. **`app/api/profile/business/upsert/route.ts`** (NEW)
   - PUT endpoint for saving business/shop profile data
   - Validates active subscription before allowing updates
   - Returns 403 Forbidden if subscription not active
   - Whitelists safe columns for update
   - Uses Supabase service role client

2. **`tests/e2e/smoke.business-gating.spec.ts`** (NEW)
   - Playwright test file with 3 comprehensive tests
   - Tests UI gating behavior
   - Tests API 403 enforcement
   - Tests shop field visibility and editability

## Implementation Details

### Data Structure
- Uses existing `profile.business.subscriptionActive` boolean field
- Field is set by webhook or subscription management system
- Stored in `profiles` table as JSONB in `business` column

### Subscription Check Flow
1. User attempts to save shop data
2. Client calls `/api/profile/business/upsert`
3. Server authenticates user from bearer token
4. Server queries `profiles.business.subscription_active`
5. If false: returns 403 with error message
6. If true: proceeds with update, returns success

### UI Behavior
```
Without Subscription:
├─ Subscription section (visible, collapsible)
├─ CTA message (visible)
└─ All shop sections (hidden)

With Active Subscription:
├─ Subscription section (visible, collapsible)
├─ All shop sections (visible, editable)
└─ CTA message (hidden)
```

## Error Handling

### Client Side:
- Catches 403 response specifically
- Shows user-friendly error message: "Abonnement niet actief. Activeer een abonnement om wijzigingen op te slaan."
- Allows users to scroll to subscription section
- Graceful fallback for other errors

### Server Side:
- Validates token before processing
- Checks subscription status safely with service role
- Returns specific error messages for different scenarios:
  - 401: Not authenticated
  - 403: Subscription not active
  - 400: Validation error
  - 500: Server error

## Testing

### Test Coverage:
1. **UI Gating Test**
   - Verifies subscription section visible
   - Confirms shop fields hidden without subscription
   - Checks CTA message displayed

2. **API Enforcement Test**
   - Attempts shop data save without subscription
   - Verifies 403 response
   - Checks error message contains subscription reference

3. **Post-Subscription Test**
   - Verifies shop fields visible when subscribed
   - Tests field editability
   - Confirms all sections accessible

### Run Tests:
```bash
npx playwright test tests/e2e/smoke.business-gating.spec.ts
```

## Subscription Status Source

The implementation reads `subscription_active` from the `business` JSONB object in the `profiles` table. This field should be:
- **Set by**: Payment webhook (Stripe/payment provider)
- **Updated when**: Subscription activated/deactivated
- **Checked by**: Server API before allowing shop data saves

## Security Considerations

✅ **Implemented:**
- Bearer token authentication
- Service role client for subscription checks
- Column whitelisting (only safe columns updateable)
- Explicit 403 response prevents unauthorized access
- No data exposure on 403 (just error message)

✅ **RLS Policies**: Existing RLS policies should allow service role to read subscription status

## Future Enhancements

1. **Webhook Integration**: Ensure subscription webhook updates `business.subscription_active`
2. **Trial Period**: Add trial period logic (e.g., `subscription_trial_ends_at`)
3. **Feature Flags**: Expand gating to other premium features
4. **Analytics**: Track feature usage per subscription tier
5. **Upgrade Prompts**: Add inline upgrade suggestions in shop setup flow

## Dependencies

- Supabase (auth + database)
- Next.js (API routes + React components)
- Playwright (E2E testing)

## Known Limitations

1. If subscription webhook fails to update `business.subscription_active`, user won't see shop fields
2. UI state doesn't update in real-time if subscription changes in another tab (requires page refresh)
3. Categories field handling simplified (not included in upsert for now)

## Verification Checklist

✅ UI sections conditionally render based on subscription status
✅ API endpoint created with subscription enforcement
✅ Save function updated to use new endpoint
✅ 403 errors handled gracefully on client
✅ Tests cover UI gating and API enforcement
✅ Error messages are user-friendly
✅ Bearer token properly passed to API
✅ Service role client used for subscription check
✅ Column whitelisting prevents unauthorized updates
