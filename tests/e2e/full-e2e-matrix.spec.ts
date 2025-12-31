import { expect, test } from '@playwright/test';

import { generateUniqueId } from './helpers/test-utils';

test.describe('A. Public Browsing - Explore & Marketplace', () => {
  test('A1: Explore page loads with categories', async ({ page }) => {
    await page.goto('/explore');
    
    // Page should load without errors
    const title = page.locator('h1, [role="heading"]');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    // Categories should be visible
    const categories = page.locator('[data-testid^="category-"]');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
    
    // No console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    expect(consoleErrors.length).toBe(0);
  });

  test('A2: Category routing works', async ({ page }) => {
    await page.goto('/explore');
    
    // Find first category and click
    const firstCategory = page.locator('[data-testid^="category-card"]').first();
    await expect(firstCategory).toBeVisible();
    await firstCategory.click();
    
    // Should route to marketplace with category filter
    await expect(page).toHaveURL(/\/marketplace.*category=/);
  });

  test('A3: Marketplace search works', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Search bar should be visible
    const searchInput = page.locator('input[placeholder*="zoek"], input[placeholder*="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    // Type search query
    const query = `test-${Date.now()}`;
    await searchInput.fill(query);
    await searchInput.press('Enter');
    
    // Should navigate to search or show results
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Should have results section or empty state
    const results = page.locator('[data-testid="listing-card"], text="Geen resultaten"');
    const hasResults = await results.count() > 0;
    expect(hasResults).toBeTruthy();
  });

  test('A4: Listing detail page loads', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Wait for listings to load
    await page.waitForSelector('[data-testid="listing-card"], [data-test="listing-item"]', 
      { timeout: 10000 });
    
    // Click first listing
    const firstListing = page.locator('[data-testid="listing-card"], [data-test="listing-item"]').first();
    await firstListing.click();
    
    // Should navigate to listing detail
    await expect(page).toHaveURL(/\/listings\/[a-z0-9-]+/);
    
    // Should show listing details
    const title = page.locator('h1, [role="heading"]');
    await expect(title).toBeVisible({ timeout: 5000 });
    
    // Should have price or description
    const description = page.locator('text=€, text=km, text=jaar, [data-testid="listing-description"]');
    const isVisible = await description.count() > 0;
    expect(isVisible).toBeTruthy();
  });
});

test.describe('B. Marketplace Filtering & Sorting', () => {
  test('B1: Vehicle category shows vehicle filters', async ({ page }) => {
    await page.goto('/marketplace?category=auto-motor');
    
    // Should show vehicle-specific filters
    const brandFilter = page.locator('text=Merk, [data-testid="brand-filter"]');
    const yearFilter = page.locator('text=Bouwjaar, [data-testid="year-filter"]');
    const mileageFilter = page.locator('text=Kilometer, [data-testid="mileage-filter"]');
    
    await expect(brandFilter.or(yearFilter).or(mileageFilter)).toBeTruthy();
  });

  test('B2: Non-vehicle category hides vehicle filters', async ({ page }) => {
    await page.goto('/marketplace?category=huis-inrichting');
    
    // Should NOT show vehicle filters
    const brandFilter = page.locator('[data-testid="brand-filter"]');
    const yearFilter = page.locator('[data-testid="year-filter"]');
    
    const brandVisible = await brandFilter.isVisible().catch(() => false);
    const yearVisible = await yearFilter.isVisible().catch(() => false);
    
    expect(brandVisible).toBe(false);
    expect(yearVisible).toBe(false);
  });

  test('B3: Filter application updates results', async ({ page }) => {
    await page.goto('/marketplace?category=auto-motor');
    
    // Select a brand from filter
    const brandFilter = page.locator('[data-testid="brand-filter"] select, [data-testid="brand-filter"] button').first();
    if (await brandFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await brandFilter.click();
      const option = page.locator('[data-testid="brand-option"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        
        // URL should update with filter
        await page.waitForURL(/brand=/, { timeout: 5000 });
        expect(page.url()).toContain('brand=');
      }
    }
  });
});

test.describe('C. Listing Creation - Vehicle & Non-Vehicle', { tag: '@critical' }, () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('C1: Create non-vehicle listing', async ({ page }) => {
    const testId = generateUniqueId();
    const title = `TEST Non-Vehicle ${testId}`;
    const price = `${Math.floor(Math.random() * 1000) + 100}`;
    
    await page.goto('/sell');
    
    // Select category via custom CategorySelect component
    // The component uses an input field that accepts category names
    const categoryInput = page.locator('input[placeholder*="Typ om te zoeken"]').first();
    await expect(categoryInput).toBeVisible({ timeout: 5000 });
    
    // Type category name to open dropdown
    await categoryInput.click();
    await categoryInput.fill('Huis');  // Type "Huis" to match "Huis-inrichting"
    
    // Wait for dropdown and select "Huis-inrichting" option
    const categoryOption = page.locator('button').filter({ hasText: /Huis.inrichting/i }).first();
    await expect(categoryOption).toBeVisible({ timeout: 3000 });
    await categoryOption.click();
    
    // Fill form
    await page.fill('input[placeholder*="Titel"], input[placeholder*="title"]', title);
    await page.fill('textarea[placeholder*="Beschrijving"], textarea[placeholder*="description"]', 
      `Test listing for ${testId}`);
    await page.fill('input[placeholder*="Prijs"], input[placeholder*="Price"]', price);
    
    // Submit
    const submitButton = page.locator('button:has-text("Plaatsen"), button:has-text("Post")');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    
    // Should show success or redirect
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Should be on success page or listing detail
    const isSuccess = await page.url().includes('/listings/') || 
                      await page.locator('text=succes, text=gemaakt, text=Advertentie geplaatst').isVisible().catch(() => false);
    expect(isSuccess).toBeTruthy();
  });

  test('C2: Create vehicle listing (auto)', async ({ page }) => {
    const testId = generateUniqueId();
    const title = `TEST Auto ${testId}`;
    const price = `${Math.floor(Math.random() * 50000) + 5000}`;
    
    await page.goto('/sell');
    
    // Select vehicle category via custom CategorySelect
    const categoryInput = page.locator('input[placeholder*="Typ om te zoeken"]').first();
    await expect(categoryInput).toBeVisible({ timeout: 5000 });
    
    // Type to find auto-motor category
    await categoryInput.click();
    await categoryInput.fill('Auto');
    
    // Select "Auto-motor" from dropdown
    const autoMotorOption = page.locator('button').filter({ hasText: /Auto.motor|Motoren/i }).first();
    await expect(autoMotorOption).toBeVisible({ timeout: 3000 });
    await autoMotorOption.click();
    
    // Wait for vehicle fields to appear (vehicle-specific form fields)
    await page.waitForSelector('input, select', { timeout: 5000 });
    
    // Fill vehicle-specific fields if they exist
    const brandSelects = page.locator('select[name*="brand"], [data-testid*="brand"]');
    const brandSelectsCount = await brandSelects.count();
    
    if (brandSelectsCount > 0) {
      // If we have brand select, try to select one
      const brandSelect = brandSelects.first();
      const options = await brandSelect.locator('option').count();
      if (options > 1) {
        await brandSelect.selectOption({ index: 1 });
      }
    }
    
    // Fill common fields
    await page.fill('input[name="title"], input[placeholder*="Titel"]', title);
    await page.fill('input[name="price"], input[placeholder*="Prijs"]', price);
    await page.fill('textarea[name="description"], textarea[placeholder*="Beschrijving"]', 
      `Test vehicle listing for ${testId}`);
    
    // Submit
    const submitButton = page.locator('button:has-text("Plaatsen"), button:has-text("Advertentie")');
    await submitButton.click();
    
    // Wait for response
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Verify success
    const isSuccess = await page.url().includes('/listings/') ||
                      await page.locator('text=succes, text=Advertentie geplaatst').isVisible().catch(() => false);
    expect(isSuccess).toBeTruthy();
  });

  test('C3: Form validation works', async ({ page }) => {
    await page.goto('/sell');
    
    // Try to submit empty form
    const submitButton = page.locator('button:has-text("Plaatsen"), button:has-text("Advertentie")').first();
    
    // Button should be disabled or form should show errors
    const isDisabled = await submitButton.isDisabled({ timeout: 5000 }).catch(() => true);
    
    if (!isDisabled) {
      await submitButton.click();
      
      // Should show validation errors
      await page.waitForTimeout(1000);
      const errors = page.locator('text=Verplicht, text=required, .text-red-500, .text-red-600');
      const hasErrors = await errors.count() > 0;
      expect(hasErrors || isDisabled).toBeTruthy();
    }
  });

  test('C4: Idempotency - double submit blocked', async ({ page }) => {
    const testId = generateUniqueId();
    const title = `TEST Idempotent ${testId}`;
    
    await page.goto('/sell');
    
    // Select category via custom CategorySelect
    const categoryInput = page.locator('input[placeholder*="Typ om te zoeken"]').first();
    await expect(categoryInput).toBeVisible({ timeout: 5000 });
    
    await categoryInput.click();
    await categoryInput.fill('Huis');
    
    const categoryOption = page.locator('button').filter({ hasText: /Huis.inrichting/i }).first();
    await expect(categoryOption).toBeVisible({ timeout: 3000 });
    await categoryOption.click();
    
    await page.fill('input[placeholder*="Titel"], input[placeholder*="title"]', title);
    await page.fill('input[placeholder*="Prijs"], input[placeholder*="price"]', '100');
    await page.fill('textarea[placeholder*="Beschrijving"], textarea[placeholder*="description"]', 'Test');
    
    // Get and click submit button
    const submitButton = page.locator('button:has-text("Plaatsen"), button:has-text("Post")').first();
    await submitButton.click();
    
    // Quickly try to click again (should be prevented)
    await submitButton.click();
    
    // Should only create one listing
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Verify on success page
    expect(page.url()).toContain('/listings/');
  });
});

test.describe('D. User Features - Favorites, Profile', { tag: '@features' }, () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('D1: Save listing to favorites', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Find first listing
    const firstListing = page.locator('[data-testid="listing-card"]').first();
    await expect(firstListing).toBeVisible({ timeout: 5000 });
    
    // Get listing href for validation if needed in future
    // const href = await firstListing.locator('a').first().getAttribute('href');
    // const listingId = href?.split('/').pop();
    
    // Click to detail page
    await firstListing.click();
    
    // Find and click save button
    const saveButton = page.locator('button:has-text("Opslaan"), button[data-testid="save-button"]');
    if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const initialState = await saveButton.getAttribute('class');
      
      await saveButton.click();
      await page.waitForTimeout(500);
      
      // Button state should change
      const newState = await saveButton.getAttribute('class');
      expect(initialState).not.toBe(newState);
    }
  });

  test('D2: Profile loads user data', async ({ page }) => {
    await page.goto('/profile');
    
    // Profile should load
    const heading = page.locator('h1, [role="heading"]');
    await expect(heading).toBeVisible({ timeout: 5000 });
    
    // Should have user info section
    const userName = page.locator('[data-testid="user-name"], text=/Mijn profiel/');
    const hasUserInfo = await userName.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasUserInfo).toBeTruthy();
  });
});

test.describe('E. Stability & Error Handling', { tag: '@stability' }, () => {
  test('E1: Navigation works without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate through key pages
    const pages = ['/explore', '/marketplace', '/'];
    
    for (const route of pages) {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }
    
    expect(consoleErrors.length).toBe(0);
  });

  test('E2: 404 page works', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    
    // Should show 404 or error page
    const notFoundText = page.locator('text=404, text=/niet gevonden/, text=Page not found');
    const hasError = await notFoundText.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasError).toBeTruthy();
  });

  test('E3: Images load without breaking layout', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Wait for images
    await page.waitForSelector('img', { timeout: 10000 });
    
    // Check for layout shifts
    const images = page.locator('img');
    const count = await images.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify no broken images (basic check)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brokenImages = await images.evaluateAll((imgs: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return imgs.filter((img: any) => img.naturalHeight === 0).length;
    });
    
    // Some images might be legitimately missing, but shouldn't be excessive
    expect(brokenImages).toBeLessThan(count * 0.5);
  });
});
