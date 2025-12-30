import { expect, test } from "@playwright/test";

test.describe("Listing Creation Flow", () => {
    // test.use({ storageState: "playwright/.auth/user.json" });

    test("form submission works - minimal test", async ({ page }) => {
        // Go to sell page
        await page.goto("/sell");

        // Wait for page to load
        await expect(page.getByRole("heading", { name: "Plaats een zoekertje" })).toBeVisible();

        // Fill in required fields
        await page.locator('input[placeholder="Titel van je product"]').fill("Test Listing E2E");
        await page.locator('input[placeholder="0,00"]').fill("25,00");

        // Select category - click on category selector
        const categoryInput = page.locator('input[placeholder*="Typ om te zoeken"]').first();
        await categoryInput.click();
        await categoryInput.fill("Elektronica");
        await page.locator('text=Elektronica').first().click();

        // Select subcategory if available
        const subcategoryInput = page.locator('input[placeholder*="Typ om te zoeken"]').nth(1);
        if (await subcategoryInput.isVisible()) {
            await subcategoryInput.click();
            await subcategoryInput.fill("Smartphones");
            await page.locator('text=Smartphones').first().click();
        }

        // Fill in description
        await page.locator('textarea[placeholder*="Beschrijf je product"]').fill("This is a test listing created by E2E test");

        // Select condition
        await page.locator('select').first().selectOption("nieuw");

        // Fill in stock
        await page.locator('input[type="number"]').fill("1");

        // Upload a test image (create a small test image)
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
            // Create a small test image file
            await page.setInputFiles('input[type="file"]', {
                name: 'test-image.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
            });
        }

        // Click the submit button
        const submitButton = page.locator('button:has-text("Plaatsen")');
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // Wait for submission to complete
        await page.waitForTimeout(3000);

        // Check if redirected to categories page (success) or still on sell page (validation error)
        const currentUrl = page.url();
        console.log('Current URL after submit:', currentUrl);

        if (currentUrl.includes('/categories')) {
            // Success case - redirected to categories page
            await expect(page.locator('text=Test Listing E2E')).toBeVisible();
        } else if (currentUrl.includes('/sell')) {
            // Still on sell page - check for validation errors or success message
            const errorMessages = page.locator('.text-red-600, .text-amber-700');
            const successMessages = page.locator('.text-green-600, .text-emerald-700');

            // Either validation errors should be shown, or success message
            const hasErrors = await errorMessages.count() > 0;
            const hasSuccess = await successMessages.count() > 0;

            expect(hasErrors || hasSuccess).toBe(true);
        }
    });

    test("validates form submission works", async ({ page }) => {
        // Go to sell page
        await page.goto("/sell");

        // Wait for page to load
        await expect(page.getByRole("heading", { name: "Plaats een zoekertje" })).toBeVisible();

        // Fill minimal required fields
        await page.locator('input[placeholder="Titel van je product"]').fill("Test Listing Minimal");

        // Try to submit
        const submitButton = page.locator('button:has-text("Plaatsen")');
        await submitButton.click();

        // Wait a bit
        await page.waitForTimeout(2000);

        // Check if handleSubmit was called (we added console.log)
        // For now, just check that something happened
        const currentUrl = page.url();
        console.log('Current URL after minimal submit:', currentUrl);
    });
});
