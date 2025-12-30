# REPOSITORY PROBLEMS ANALYSIS
## 30 December 2025

---

## 🔴 CRITICAL ERRORS

### 1. **Test Files Reference Non-Existent Paths** (2 files)

**Files Affected**:
- `tests/permissions.test.ts` - Line 3, 32
- `tests/subscriptions.test.ts` - Line 3, 4

**Problem**: Import paths point to `../v4/lib/domain/` which doesn't exist
```typescript
// ❌ WRONG
vi.mock("../v4/lib/supabase/server", () => ({ ... }));
vi.mock("../v4/lib/domain/gating", () => ({ ... }));
vi.mock("../v4/lib/domain/subscriptions", () => ({ ... }));

// ✅ CORRECT
vi.mock("../lib/supabase/server", () => ({ ... }));
// etc.
```

**Impact**: 
- Tests cannot run
- CI/CD pipeline will fail
- Vitest cannot resolve imports

**Solution**: Update import paths to remove `/v4` prefix

---

### 2. **check-admin.js Has Hardcoded Credentials** (1 file)

**File**: `check-admin.js` - Lines 14-15

**Problem**: Contains actual Supabase credentials
```javascript
// ❌ SECURITY RISK
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,      // OK - in env
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // OK - in env
);

async function checkAdminUser() {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'info@ocaso.be',           // ❌ HARDCODED EMAIL
    password: 'Arsamat1105'           // ❌ HARDCODED PASSWORD (EXPOSED!)
  });
```

**Impact**: 
- Admin credentials exposed in git history
- Security breach
- Password is plaintext in repository

**Solution**: 
1. Delete this file
2. Change the `info@ocaso.be` password IMMEDIATELY
3. Remove from git history with: `git rm --cached check-admin.js`

---

## 🟡 LINT WARNINGS (Auto-Fixable)

### Import Sorting Issues (6 files)

**Files with import sort warnings**:
1. `app/search/page.tsx` - Line 1
2. `app/listings/[id]/page.tsx` - Line 7
3. `app/login/page.tsx` - Line 3
4. `app/api/affiliate/recommend/route.ts` - Line 9
5. `components/AffiliateRecommendations.tsx` - Line 11
6. `tests/e2e/smoke.affiliate.spec.ts` - Line 1

**Problem**: Import statements not sorted alphabetically
**Severity**: Warning (auto-fixable)
**Fix**: Run `npm run lint:fix` or ESLint with `--fix`

---

### React Hook useEffect Missing Dependency (1 file)

**File**: `components/AffiliateRecommendations.tsx` - Line 48

**Problem**: 
```typescript
useEffect(() => {
  // ...
  fetchRecommendations();  // ❌ Not in dependency array
}, [query, category]);     // Missing: fetchRecommendations
```

**Severity**: Warning
**Impact**: May cause stale closures if fetchRecommendations changes
**Fix**: Add `fetchRecommendations` to dependency array OR move function outside useEffect

---

### HTML img Element Without Optimization (1 file)

**File**: `components/AffiliateRecommendations.tsx` - Line 112

**Problem**:
```tsx
// ❌ Using <img> instead of <Image>
<img 
  src={product.image_url} 
  alt={product.title} 
  className="..." 
/>

// ✅ CORRECT (Next.js optimized)
import Image from 'next/image';
<Image 
  src={product.image_url} 
  alt={product.title} 
  width={200} 
  height={200}
  className="..."
/>
```

**Severity**: Warning (performance)
**Impact**: Slower image loading, higher LCP
**Fix**: Import `next/image` and use `<Image>` component

---

## 🟠 UNRESOLVED IMPORT ERRORS (2 files)

**Files with unresolved imports**:
1. `tests/permissions.test.ts` - Lines 3, 32, 37
2. `tests/subscriptions.test.ts` - Lines 3, 4

**Problem**: ESLint cannot resolve these paths:
```
✗ '../v4/lib/supabase/server' 
✗ '../v4/lib/domain/gating'
✗ '../v4/lib/domain/subscriptions'
```

**Severity**: ERROR (blocking)
**Impact**: Tests cannot run, CI/CD fails

---

## 📊 SUMMARY TABLE

| Category | Severity | Count | Files | Auto-Fixable |
|----------|----------|-------|-------|--------------|
| **Import Path Errors** | 🔴 Critical | 3 paths | 2 files | ❌ Manual |
| **Hardcoded Credentials** | 🔴 Critical | 2 secrets | 1 file | ❌ Delete file |
| **Import Sorting** | 🟡 Warning | 6 issues | 6 files | ✅ Yes |
| **useEffect Dependencies** | 🟡 Warning | 1 issue | 1 file | ✅ Yes |
| **HTML Img Element** | 🟡 Warning | 1 issue | 1 file | ✅ Yes |

---

## 🚨 PRIORITY ACTIONS

### IMMEDIATE (Today)

1. **SECURITY: Delete check-admin.js**
   ```bash
   rm check-admin.js
   git rm --cached check-admin.js
   git commit -m "Remove: delete exposed credentials file"
   ```

2. **SECURITY: Change info@ocaso.be Password**
   - Go to Supabase Admin Console
   - Reset password for info@ocaso.be
   - Update in your password manager

3. **FIX: Test File Imports**
   - Fix `tests/permissions.test.ts` - Remove `/v4` from paths
   - Fix `tests/subscriptions.test.ts` - Remove `/v4` from paths

### SHORT-TERM (This week)

4. **AUTO-FIX: Import Sorting**
   ```bash
   npm run lint:fix
   ```

5. **FIX: useEffect Dependencies**
   ```typescript
   // Move fetchRecommendations outside useEffect
   const fetchRecommendations = useCallback(async () => { ... }, [query, category]);
   
   useEffect(() => {
     // ...
     fetchRecommendations();
   }, [query, category, fetchRecommendations]);
   ```

6. **OPTIMIZE: Replace img with Image**
   - Update `components/AffiliateRecommendations.tsx`
   - Import from 'next/image'
   - Add width/height props

---

## 🔍 DETAILED FIXES

### Fix 1: Update Test Import Paths

**File**: `tests/permissions.test.ts` (Line 3)

```typescript
// ❌ BEFORE
vi.mock("../v4/lib/supabase/server", () => ({

// ✅ AFTER  
vi.mock("../lib/supabase/server", () => ({
```

**File**: `tests/permissions.test.ts` (Line 32)

```typescript
// ❌ BEFORE
} from "../v4/lib/domain/gating";

// ✅ AFTER
} from "../lib/domain/gating";
```

**File**: `tests/permissions.test.ts` (Line 37)

```typescript
// ❌ BEFORE
vi.mock("../v4/lib/domain/subscriptions", () => ({

// ✅ AFTER
vi.mock("../lib/domain/subscriptions", () => ({
```

**File**: `tests/subscriptions.test.ts` (Line 3)

```typescript
// ❌ BEFORE
vi.mock("../v4/lib/domain/subscriptions", () => ({

// ✅ AFTER
vi.mock("../lib/domain/subscriptions", () => ({
```

**File**: `tests/subscriptions.test.ts` (Line 4)

```typescript
// ❌ BEFORE
vi.mock("../v4/lib/supabase/server", () => ({

// ✅ AFTER
vi.mock("../lib/supabase/server", () => ({
```

---

### Fix 2: Delete Exposed Credentials File

```bash
# Delete the file
rm /Users/matthiasdemey/Desktop/Ocasso\ /Ocasso\ \ back\ up/Ocaso\ Rewrite/check-admin.js

# Remove from git history
git rm --cached check-admin.js
git commit -m "Remove: delete exposed admin credentials file"

# Push to clean history
git push
```

---

### Fix 3: Fix useEffect Dependencies

**File**: `components/AffiliateRecommendations.tsx`

```typescript
// ❌ BEFORE
useEffect(() => {
  const lastShown = localStorage.getItem(FREQUENCY_CAP_KEY);
  if (lastShown && Date.now() - parseInt(lastShown) < FREQUENCY_CAP_MS) {
    setShowedRecently(true);
    return;
  }
  if (!query || query.trim().length === 0) {
    return;
  }
  fetchRecommendations();
}, [query, category]);  // ❌ Missing fetchRecommendations

// ✅ AFTER (Option 1: Move function)
const fetchRecommendations = useCallback(async () => {
  setIsLoading(true);
  try {
    const params = new URLSearchParams({
      q: query!,
      limit: String(maxItems),
    });
    if (category) params.append('category', category);

    const response = await fetch(`/api/affiliate/recommend?${params}`);
    // ... rest
  } catch (error) {
    // ...
  }
}, [query, category, maxItems]);

useEffect(() => {
  const lastShown = localStorage.getItem(FREQUENCY_CAP_KEY);
  if (lastShown && Date.now() - parseInt(lastShown) < FREQUENCY_CAP_MS) {
    setShowedRecently(true);
    return;
  }
  if (!query || query.trim().length === 0) {
    return;
  }
  fetchRecommendations();
}, [query, category, fetchRecommendations]);
```

---

### Fix 4: Replace img with Next Image

**File**: `components/AffiliateRecommendations.tsx` (Line 1 + 112)

```typescript
// ❌ BEFORE
import { useEffect, useState } from 'react';

// ...JSX
<img 
  src={product.image_url} 
  alt={product.title} 
  className="h-20 w-20 object-cover rounded"
/>

// ✅ AFTER
import { useEffect, useState } from 'react';
import Image from 'next/image';

// ...JSX
<Image 
  src={product.image_url} 
  alt={product.title} 
  width={80}
  height={80}
  className="h-20 w-20 object-cover rounded"
/>
```

---

## ✅ VERIFICATION STEPS

After fixes:

1. **Verify Tests Can Load**
   ```bash
   npx vitest list tests/
   ```
   Expected: Both test files listed

2. **Run Linter**
   ```bash
   npm run lint
   ```
   Expected: 0 new errors, only existing warnings

3. **Run Type Check**
   ```bash
   npm run typecheck
   ```
   Expected: No type errors

4. **Verify No Credentials in Git**
   ```bash
   git log --all -p -- check-admin.js | head -50
   # Should show file deleted, no credentials in current
   ```

5. **Run Tests**
   ```bash
   npm test
   ```
   Expected: All tests pass

---

## 📝 NOTES

- **check-admin.js**: This file should never have been committed. It contains sensitive admin credentials.
- **Test paths**: The `/v4` directory structure has been refactored. Tests need to reference current paths.
- **Import sorting**: ESLint can auto-fix these with `--fix` flag.
- **Performance warnings**: Using Next.js Image component is important for LCP optimization.

---

**Status**: 🔴 **2 CRITICAL ISSUES** + 🟡 **5 AUTO-FIXABLE WARNINGS**

**Recommendation**: Fix critical issues immediately before next commit/merge.
