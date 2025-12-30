import { expect, test } from "@playwright/test";

test.describe("B2C Flow - Business to Customer", () => {
    test("seller creates listing, buyer purchases with payment", async ({ page }) => {
        const timestamp = Date.now();
        const buyerEmail = `buyer-${timestamp}@test.ocaso.com`;
        const sellerEmail = `seller-${timestamp}@test.ocaso.com`;
        const password = "TestPassword123!";

        // Step 1: Seller signs up and creates business profile
        await page.goto("/register");
        await page.fill('[data-testid="register-email"]', sellerEmail);
        await page.fill('[data-testid="register-password"]', password);
        await page.fill('[data-testid="register-confirm-password"]', password);
        await page.click('[data-testid="register-submit"]');

        // Complete seller profile as business
        await page.goto("/profile");
        await page.fill('input[name="firstName"]', "Business");
        await page.fill('input[name="lastName"]', "Owner");
        await page.selectOption('select[name="role"]', "seller");
        await page.click('button[type="submit"]');

        // Create business profile
        await page.goto("/business/setup");
        await page.fill(
            'input[name="businessName"]',
            `Test Business ${timestamp}`,
        );
        await page.fill(
            'textarea[name="description"]',
            "A test business for E2E testing",
        );
        await page.selectOption('select[name="category"]', "retail");
        await page.click('button[type="submit"]');

        // Step 2: Seller creates listing
        await page.goto("/sell");
        await page.fill('input[name="title"]', `Premium Product ${timestamp}`);
        await page.fill(
            'textarea[name="description"]',
            "High-quality product for testing payments",
        );
        await page.fill('input[name="price"]', "99.99");
        await page.selectOption('select[name="category"]', "electronics");
        await page.check('input[name="acceptsPayments"]'); // Enable payments
        await page.click('button[type="submit"]');

        const listingUrl = page.url();

        // Step 3: Buyer signs up and views listing
        const buyerPage = await page.context().newPage();
        await buyerPage.goto("/register");
        await buyerPage.fill('[data-testid="register-email"]', buyerEmail);
        await buyerPage.fill('[data-testid="register-password"]', password);
        await buyerPage.fill(
            '[data-testid="register-confirm-password"]',
            password,
        );
        await buyerPage.click('[data-testid="register-submit"]');

        await buyerPage.goto(listingUrl);
        await expect(buyerPage.locator("h1")).toContainText(
            `Premium Product ${timestamp}`,
        );

        // Step 4: Buyer initiates purchase
        await buyerPage.click('button:has-text("Buy Now")');

        // Should redirect to checkout
        await expect(buyerPage).toHaveURL(/\/checkout/);

        // Fill checkout form
        await buyerPage.fill('input[name="cardNumber"]', "4242424242424242"); // Stripe test card
        await buyerPage.fill('input[name="expiry"]', "1230");
        await buyerPage.fill('input[name="cvc"]', "123");
        await buyerPage.fill('input[name="name"]', "Test Buyer");
        await buyerPage.click('button[type="submit"]');

        // Should redirect to success page
        await expect(buyerPage).toHaveURL(/\/checkout\/success/);

        // Step 5: Seller sees sale notification
        await page.goto("/seller/dashboard");
        await expect(page.locator(".sale-notification")).toContainText(
            `Premium Product ${timestamp}`,
        );

        // Step 6: Buyer can leave review
        await buyerPage.goto("/profile/orders");
        await buyerPage.click(`text=Premium Product ${timestamp}`);
        await buyerPage.click('button:has-text("Leave Review"');

        await buyerPage.fill(
            'textarea[name="review"]',
            "Great product, fast delivery!",
        );
        await buyerPage.selectOption('select[name="rating"]', "5");
        await buyerPage.click('button[type="submit"]');

        // Verify review appears
        await expect(buyerPage.locator(".review")).toContainText(
            "Great product, fast delivery!",
        );

        // Cleanup
        await buyerPage.close();
    });

    test("seller can boost listing and see increased visibility", async ({ page }) => {
        const timestamp = Date.now();
        const sellerEmail = `boost-seller-${timestamp}@test.ocaso.com`;
        const password = "TestPassword123!";

        // Sign up as seller
        await page.goto("/register");
        await page.fill('[data-testid="register-email"]', sellerEmail);
        await page.fill('[data-testid="register-password"]', password);
        await page.fill('[data-testid="register-confirm-password"]', password);
        await page.click('[data-testid="register-submit"]');

        // Complete profile
        await page.goto("/profile");
        await page.fill('input[name="firstName"]', "Boost");
        await page.fill('input[name="lastName"]', "Seller");
        await page.selectOption('select[name="role"]', "seller");
        await page.click('button[type="submit"]');

        // Create listing
        await page.goto("/sell");
        await page.fill('input[name="title"]', `Boost Test Item ${timestamp}`);
        await page.fill(
            'textarea[name="description"]',
            "Testing boost functionality",
        );
        await page.fill('input[name="price"]', "49.99");
        await page.selectOption('select[name="category"]', "home");
        await page.click('button[type="submit"]');

        const listingUrl = page.url();

        // Navigate to listing and boost it
        await page.goto(listingUrl);
        await page.click('button:has-text("Boost Listing")');

        // Select boost duration (assuming modal appears)
        await page.click('button:has-text("7 Days")');
        await page.click('button:has-text("Confirm Boost")');

        // Should show success message
        await expect(page.locator(".success-message")).toContainText(
            "Listing boosted successfully",
        );

        // Verify boost appears in seller dashboard
        await page.goto("/seller/dashboard");
        await expect(page.locator(".active-boosts")).toContainText(
            `Boost Test Item ${timestamp}`,
        );

        // Check that listing appears in sponsored section
        await page.goto("/marketplace");
        await expect(page.locator(".sponsored-listings")).toContainText(
            `Boost Test Item ${timestamp}`,
        );
    });

    test("business subscription and premium features work", async ({ page }) => {
        const timestamp = Date.now();
        const businessEmail = `business-${timestamp}@test.ocaso.com`;
        const password = "TestPassword123!";

        // Sign up as business seller
        await page.goto("/register");
        await page.fill('[data-testid="register-email"]', businessEmail);
        await page.fill('[data-testid="register-password"]', password);
        await page.fill('[data-testid="register-confirm-password"]', password);
        await page.click('[data-testid="register-submit"]');

        // Complete business profile
        await page.goto("/profile");
        await page.fill('input[name="firstName"]', "Business");
        await page.fill('input[name="lastName"]', "Premium");
        await page.selectOption('select[name="role"]', "seller");
        await page.click('button[type="submit"]');

        // Set up business
        await page.goto("/business/setup");
        await page.fill(
            'input[name="businessName"]',
            `Premium Business ${timestamp}`,
        );
        await page.fill(
            'textarea[name="description"]',
            "Premium business testing subscription features",
        );
        await page.selectOption('select[name="category"]', "technology");
        await page.click('button[type="submit"]');

        // Navigate to subscriptions page
        await page.goto("/credits");
        await expect(page.locator("h1")).toContainText(/Credits|Subscription/);

        // Upgrade to premium plan
        await page.click('button:has-text("Upgrade to Premium")');
        await page.click('button:has-text("Standard Plan"'); // Select standard plan

        // Fill payment details
        await page.fill('input[name="cardNumber"]', "4242424242424242");
        await page.fill('input[name="expiry"]', "1230");
        await page.fill('input[name="cvc"]', "123");
        await page.fill('input[name="name"]', "Business Owner");
        await page.click('button[type="submit"]');

        // Should redirect to success
        await expect(page).toHaveURL(/\/credits\/success/);

        // Verify premium features are unlocked
        await page.goto("/seller/analytics");
        await expect(page.locator("h1")).toContainText(/Analytics/); // Should not be blocked

        // Create multiple listings (premium allows more)
        for (let i = 1; i <= 10; i++) {
            await page.goto("/sell");
            await page.fill(
                'input[name="title"]',
                `Premium Listing ${i} ${timestamp}`,
            );
            await page.fill(
                'textarea[name="description"]',
                `Premium listing ${i} for testing`,
            );
            await page.fill('input[name="price"]', `${10 + i}.99`);
            await page.selectOption('select[name="category"]', "electronics");
            await page.click('button[type="submit"]');

            // Should succeed without limit error
            await expect(page).toHaveURL(/\/listings\/[a-zA-Z0-9-]+/);
            await page.goBack();
        }

        // Verify premium badge appears on listings
        await page.goto("/marketplace");
        await expect(page.locator(".premium-badge")).toBeVisible();
    });
});
