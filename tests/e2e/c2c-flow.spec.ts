import { expect, test } from "@playwright/test";

test.describe("C2C Flow - Customer to Customer", () => {
    test("complete signup to listing to chat flow", async ({ page }) => {
        // Generate unique test data
        const timestamp = Date.now();
        const buyerEmail = `buyer-${timestamp}@test.ocaso.com`;
        const sellerEmail = `seller-${timestamp}@test.ocaso.com`;
        const password = "TestPassword123!";

        // Step 1: Buyer signs up
        await page.goto("/register");
        await page.fill('[data-testid="register-email"]', buyerEmail);
        await page.fill('[data-testid="register-password"]', password);
        await page.fill('[data-testid="register-confirm-password"]', password);
        await page.click('[data-testid="register-submit"]');

        // Should redirect to profile completion or marketplace
        await expect(page).toHaveURL(/\/(profile|marketplace|explore)/);

        // Step 2: Seller signs up and creates listing
        // Open new page for seller
        const sellerPage = await page.context().newPage();
        await sellerPage.goto("/register");
        await sellerPage.fill('[data-testid="register-email"]', sellerEmail);
        await sellerPage.fill('[data-testid="register-password"]', password);
        await sellerPage.fill(
            '[data-testid="register-confirm-password"]',
            password,
        );
        await sellerPage.click('[data-testid="register-submit"]');

        // Complete seller profile
        await sellerPage.goto("/profile");
        await sellerPage.fill('input[name="firstName"]', "Test");
        await sellerPage.fill('input[name="lastName"]', "Seller");
        await sellerPage.selectOption('select[name="role"]', "seller");
        await sellerPage.click('button[type="submit"]');

        // Navigate to sell page and create listing
        await sellerPage.goto("/sell");
        await sellerPage.fill('input[name="title"]', `Test Item ${timestamp}`);
        await sellerPage.fill(
            'textarea[name="description"]',
            "This is a test item for E2E testing",
        );
        await sellerPage.fill('input[name="price"]', "29.99");
        await sellerPage.selectOption('select[name="category"]', "electronics"); // Assuming this exists
        await sellerPage.click('button[type="submit"]');

        // Should redirect to listing page
        await expect(sellerPage).toHaveURL(/\/listings\/[a-zA-Z0-9-]+/);

        // Get the listing URL
        const listingUrl = sellerPage.url();

        // Step 3: Buyer finds and views the listing
        await page.goto(listingUrl);
        await expect(page.locator("h1")).toContainText(
            `Test Item ${timestamp}`,
        );

        // Step 4: Buyer initiates chat with seller
        await page.click('button:has-text("Contact Seller")');
        await page.fill(
            'textarea[name="message"]',
            "Hi! Is this item still available?",
        );
        await page.click('button[type="submit"]');

        // Should redirect to chat page
        await expect(page).toHaveURL(/\/messages/);

        // Verify chat was created
        await expect(page.locator(".chat-message")).toContainText(
            "Hi! Is this item still available?",
        );

        // Step 5: Seller responds in chat
        await sellerPage.goto("/messages");
        await expect(sellerPage.locator(".chat-thread")).toContainText(
            `Test Item ${timestamp}`,
        );
        await sellerPage.click(".chat-thread"); // Click on the chat thread

        await sellerPage.fill(
            'textarea[name="message"]',
            "Yes, it's still available! Are you interested?",
        );
        await sellerPage.click('button[type="submit"]');

        // Step 6: Buyer receives and sees the response
        await page.reload();
        await expect(page.locator(".chat-message").last()).toContainText(
            "Yes, it's still available! Are you interested?",
        );

        // Step 7: Buyer sends final message
        await page.fill(
            'textarea[name="message"]',
            "Great! I'll take it. How do we proceed?",
        );
        await page.click('button[type="submit"]');

        // Verify final message appears
        await expect(page.locator(".chat-message").last()).toContainText(
            "Great! I'll take it. How do we proceed?",
        );

        // Cleanup: Close seller page
        await sellerPage.close();
    });

    test("buyer can browse marketplace and filter listings", async ({ page }) => {
        test.setTimeout(60000); // Increase timeout for this test

        await page.goto("/explore");
        await page.waitForLoadState("networkidle");

        // Verify explore page loads - target the specific h1 with "Ontdekken"
        await expect(page.getByTestId("explore-title")).toBeVisible();

        // Verify the hero search component is present
        await expect(page.locator("text=Zoek nieuw of tweedehands"))
            .toBeVisible();

        // Check that recommended listings section exists
        await expect(page.locator("text=Aanbevolen voor jou")).toBeVisible();

        // Wait a bit more for any client-side redirects
        await page.waitForTimeout(2000);

        // Check if we're still on the explore page
        const currentUrl = page.url();
        if (!currentUrl.includes("/explore")) {
            console.log("Redirected to:", currentUrl);
            // Take screenshot for debugging
            await page.screenshot({
                path: "debug-redirect.png",
                fullPage: true,
            });
            throw new Error(`Unexpected redirect to ${currentUrl}`);
        }

        try {
            // Test search functionality with reliable interaction
            const searchInput = page.getByTestId("explore-search");
            await expect(searchInput).toBeVisible({ timeout: 10000 });
            await expect(searchInput).toBeEnabled();
            await searchInput.scrollIntoViewIfNeeded();
            await searchInput.click({ force: true });
            await searchInput.fill("laptop");

            // Submit search
            await page.keyboard.press("Enter");

            // Verify search results page
            await expect(page).toHaveURL(/\?q=laptop/);
        } catch (error) {
            // Take screenshot on failure for debugging
            await page.screenshot({
                path: "debug-explore-search-failure.png",
                fullPage: true,
            });
            throw error;
        }
    });

    test("user authentication flow works correctly", async ({ page }) => {
        const testEmail = `auth-test-${Date.now()}@test.ocaso.com`;
        const password = "TestPassword123!";

        // Test registration
        await page.goto("/register");
        await page.fill('[data-testid="register-email"]', testEmail);
        await page.fill('[data-testid="register-password"]', password);
        await page.fill('[data-testid="register-confirm-password"]', password);
        await page.click('[data-testid="register-submit"]');

        // Should redirect after registration
        await expect(page).toHaveURL(/\/(profile|marketplace|explore)/);

        // Test logout
        await page.click('button:has-text("Logout")');
        await expect(page).toHaveURL("/");

        // Test login
        await page.goto("/login");
        await page.fill('[data-testid="login-email"]', testEmail);
        await page.fill('[data-testid="login-password"]', password);
        await page.click('[data-testid="login-submit"]');

        // Should redirect after login
        await expect(page).toHaveURL(/\/(profile|marketplace|explore)/);
    });
});
