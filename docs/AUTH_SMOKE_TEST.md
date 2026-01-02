# Auth Social Login Smoke Test

## Datum
31 december 2025

## Context
Branch: fix/auth-social-login-restore
Test URL: Lokale dev server (http://localhost:3000) of Preview deploy

## Test Procedure

### A) UI Visibility Test
1. **Open /login page**
   - ✅ EXPECTED: Page loads without errors
   - ✅ EXPECTED: "Inloggen" heading visible
   - ✅ EXPECTED: OAuth section visible with:
     - "Verder met Google" button (with Google icon)
     - "Verder met Facebook" button (with Facebook icon)
     - "of met e-mail & wachtwoord" text
   - ✅ EXPECTED: Email/password form below OAuth section

2. **Open /register page**
   - ✅ EXPECTED: Page loads without errors
   - ✅ EXPECTED: "Account aanmaken" heading visible
   - ✅ EXPECTED: OAuth section visible with:
     - "Verder met Google" button (with Google icon)
     - "Verder met Facebook" button (with Facebook icon)
     - "of met e-mail & wachtwoord" text
   - ✅ EXPECTED: Registration form below OAuth section

3. **Styling Check**
   - ✅ EXPECTED: OAuth buttons have rounded-xl borders
   - ✅ EXPECTED: Consistent with existing form styling
   - ✅ EXPECTED: Icons properly sized (18x18px)

### B) OAuth Flow Test (Manual)
**⚠️ Requires configured providers in Supabase**

1. **Google OAuth Test**
   - Click "Verder met Google" on /login
   - ✅ EXPECTED: Redirect to Google OAuth page
   - ✅ EXPECTED: After auth, redirect back to `/auth/callback`
   - ✅ EXPECTED: Final redirect to `/profile`
   - ✅ EXPECTED: User logged in with Google account

2. **Facebook OAuth Test**
   - Click "Verder met Facebook" on /login
   - ✅ EXPECTED: Redirect to Facebook OAuth page
   - ✅ EXPECTED: After auth, redirect back to `/auth/callback`
   - ✅ EXPECTED: Final redirect to `/profile`
   - ✅ EXPECTED: User logged in with Facebook account

3. **Error Handling Test**
   - Try OAuth with misconfigured provider
   - ✅ EXPECTED: Error message displayed on login page
   - ✅ EXPECTED: No silent failures

### C) Regression Tests
1. **Email/Password Login**
   - ✅ EXPECTED: Still works normally
   - ✅ EXPECTED: Rate limiting still active
   - ✅ EXPECTED: Password reset still works

2. **Email/Password Registration**
   - ✅ EXPECTED: Still works normally
   - ✅ EXPECTED: Validation still works

3. **Other Auth Flows**
   - ✅ EXPECTED: /auth/confirm still works
   - ✅ EXPECTED: /auth/reset still works

## Test Results Template

### UI Visibility
- [ ] /login OAuth buttons visible
- [ ] /register OAuth buttons visible
- [ ] Styling consistent

### OAuth Flow (Google)
- [ ] Redirect to Google
- [ ] Callback succeeds
- [ ] Redirect to /profile
- [ ] User session created

### OAuth Flow (Facebook)
- [ ] Redirect to Facebook
- [ ] Callback succeeds
- [ ] Redirect to /profile
- [ ] User session created

### Error Handling
- [ ] OAuth errors displayed properly

### Regressions
- [ ] Email/password login works
- [ ] Email/password registration works
- [ ] Other auth flows work

## Environment Setup Required

### Supabase Dashboard
1. Go to Authentication > Providers
2. Configure Google:
   - Enable Google provider
   - Add redirect URLs:
     - `http://localhost:3000/auth/callback` (dev)
     - `https://ocaso-rewrite.vercel.app/auth/callback` (preview)
     - `https://ocaso.be/auth/callback` (prod)
3. Configure Facebook:
   - Enable Facebook provider
   - Add redirect URLs (same as Google)

### Environment Variables
```bash
# For local testing
NEXT_PUBLIC_ENABLE_OAUTH=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For preview/production
NEXT_PUBLIC_ENABLE_OAUTH=true
NEXT_PUBLIC_SITE_URL=https://ocaso.be  # or preview URL
```

## Notes
- If providers not configured, OAuth buttons will show but flows will fail with clear error messages
- Test both success and error scenarios
- Verify no impact on /sell, marketplace, or other core features
