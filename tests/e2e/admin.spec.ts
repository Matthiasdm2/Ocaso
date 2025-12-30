import { expect, test } from "@playwright/test";

test.describe("Admin Panel Functionality", () => {
    test("admin can access admin panel and view dashboard", async ({ page }) => {
        // Navigate to admin panel (already authenticated via setup)
        await page.goto("/admin");

        // Should not redirect to login or show 403
        await expect(page).toHaveURL("/admin");

        // Verify no "Toegang Geweigerd" (Access Denied) message
        await expect(page.locator("text=Toegang Geweigerd")).not.toBeVisible();

        // Verify admin dashboard loads (check for admin content)
        await expect(page.locator("text=Admin Panel")).toBeVisible();
    });

    test("admin can manage users", async ({ page }) => {
        // Sign in as admin
        await page.goto("/login");
        await page.fill('[data-testid="login-email"]', "admin@ocaso.com");
        await page.fill('[data-testid="login-password"]', "AdminPassword123!");
        await page.click('[data-testid="login-submit"]');

        // Navigate to user management
        await page.goto("/admin/users");
        await expect(page.locator("h1")).toContainText(/Users|User Management/);

        // Search for a user
        await page.fill('input[placeholder*="search"]', "test@example.com");
        await page.click('button[type="submit"]');

        // Should show user results
        await expect(page.locator(".user-row")).toBeVisible();

        // Click on a user to view details
        await page.click(".user-row:first-child");
        await expect(page.locator(".user-details")).toBeVisible();

        // Test user actions (suspend, activate, etc.)
        await page.click('button:has-text("Suspend")');
        await expect(page.locator(".success-message")).toContainText(
            /suspended/i,
        );

        await page.click('button:has-text("Activate")');
        await expect(page.locator(".success-message")).toContainText(
            /activated/i,
        );
    });

    test("admin can manage listings", async ({ page }) => {
        // Sign in as admin
        await page.goto("/login");
        await page.fill('[data-testid="login-email"]', "admin@ocaso.com");
        await page.fill('[data-testid="login-password"]', "AdminPassword123!");
        await page.click('[data-testid="login-submit"]');

        // Navigate to listings management
        await page.goto("/admin/listings");
        await expect(page.locator("h1")).toContainText(/Listings/);

        // Filter listings
        await page.selectOption('select[name="status"]', "active");
        await page.click('button[type="submit"]');

        // Should show filtered results
        await expect(page.locator(".listing-row")).toBeVisible();

        // Test listing moderation
        await page.click(".listing-row:first-child .moderate-btn");
        await page.selectOption('select[name="action"]', "approve");
        await page.click('button:has-text("Submit")');

        await expect(page.locator(".success-message")).toContainText(
            /approved/i,
        );
    });

    test("admin can view analytics and reports", async ({ page }) => {
        // Sign in as admin
        await page.goto("/login");
        await page.fill('[data-testid="login-email"]', "admin@ocaso.com");
        await page.fill('[data-testid="login-password"]', "AdminPassword123!");
        await page.click('[data-testid="login-submit"]');

        // Navigate to analytics
        await page.goto("/admin/analytics");
        await expect(page.locator("h1")).toContainText(/Analytics|Reports/);

        // Check charts are rendered
        await expect(page.locator(".chart")).toBeVisible();

        // Test date range selection
        await page.fill('input[name="startDate"]', "2024-01-01");
        await page.fill('input[name="endDate"]', "2024-12-31");
        await page.click('button:has-text("Apply Filter")');

        // Charts should update
        await expect(page.locator(".chart")).toBeVisible();

        // Export report
        await page.click('button:has-text("Export")');
        // Should trigger download or show success message
        await expect(page.locator(".success-message")).toContainText(/export/i);
    });

    test("admin can manage system settings", async ({ page }) => {
        // Sign in as admin
        await page.goto("/login");
        await page.fill('[data-testid="login-email"]', "admin@ocaso.com");
        await page.fill('[data-testid="login-password"]', "AdminPassword123!");
        await page.click('[data-testid="login-submit"]');

        // Navigate to settings
        await page.goto("/admin/settings");
        await expect(page.locator("h1")).toContainText(
            /Settings|Configuration/,
        );

        // Update a setting
        await page.fill('input[name="siteName"]', "Updated OCASO");
        await page.click('button:has-text("Save")');

        await expect(page.locator(".success-message")).toContainText(/saved/i);

        // Verify setting was updated
        await page.reload();
        await expect(page.locator('input[name="siteName"]')).toHaveValue(
            "Updated OCASO",
        );
    });

    test("admin can handle reported content", async ({ page }) => {
        // Sign in as admin
        await page.goto("/login");
        await page.fill('[data-testid="login-email"]', "admin@ocaso.com");
        await page.fill('[data-testid="login-password"]', "AdminPassword123!");
        await page.click('[data-testid="login-submit"]');

        // Navigate to moderation queue
        await page.goto("/admin/moderation");
        await expect(page.locator("h1")).toContainText(/Moderation|Reports/);

        // Check for reported items
        const reportedItems = page.locator(".reported-item");
        if (await reportedItems.count() > 0) {
            // Handle a report
            await reportedItems.first().click();
            await page.selectOption('select[name="action"]', "remove");
            await page.fill(
                'textarea[name="reason"]',
                "Violates community guidelines",
            );
            await page.click('button:has-text("Submit")');

            await expect(page.locator(".success-message")).toContainText(
                /removed/i,
            );
        } else {
            // No reports to handle - that's also fine
            await expect(page.locator(".no-reports")).toBeVisible();
        }
    });

    test("admin security - non-admin cannot access admin panel", async ({ page }) => {
        const timestamp = Date.now();
        const userEmail = `regular-user-${timestamp}@test.ocaso.com`;
        const password = "TestPassword123!";

        // Sign up as regular user
        await page.goto("/register");
        await page.fill('[data-testid="register-email"]', userEmail);
        await page.fill('[data-testid="register-password"]', password);
        await page.fill('[data-testid="register-confirm-password"]', password);
        await page.click('[data-testid="register-submit"]');

        // Try to access admin panel
        await page.goto("/admin");

        // Should redirect or show access denied
        await expect(page).toHaveURL(/\/(login|access-denied)/);
        // Or show error message
        await expect(page.locator(".error-message")).toContainText(
            /access denied|unauthorized/i,
        );
    });
});
