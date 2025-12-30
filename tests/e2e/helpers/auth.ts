import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * E2E Auth Helper for deterministic test accounts
 * Uses timestamp-based emails with @ocaso-test.local domain
 */

export function generateTestEmail(prefix = "test"): string {
    const timestamp = Date.now();
    return `${prefix}+${timestamp}@ocaso-test.local`;
}

// Predefined test user credentials for deterministic auth
export const TEST_USER = {
    email: "test-user@ocaso-test.local",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "User",
};

/**
 * Authenticate using the login form (UI-based) with existing user
 * Reads credentials from environment variables
 */
export async function authenticateTestUser(page: Page): Promise<void> {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!email) throw new Error('E2E_TEST_EMAIL missing');
    if (!password) throw new Error('E2E_TEST_PASSWORD missing');
    if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing');
    if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing');

    // Navigate to login page
    await page.goto("/login");

    // Fill in email and password
    await page.fill('[data-testid="login-email"]', email);
    await page.fill('[data-testid="login-password"]', password);

    // Submit the form
    await page.click('[data-testid="login-submit"]');

    // Wait for successful redirect (e.g., to /profile) or check for error
    try {
        await page.waitForURL("**/profile", { timeout: 10000 });
    } catch {
        // Check for error message
        const errorMsg = page.locator('p.text-red-500').or(page.locator('[data-testid="login-error"]'));
        if (await errorMsg.isVisible()) {
            const errorText = await errorMsg.textContent();
            throw new Error(`Login failed: ${errorText}`);
        }
        throw new Error('Login failed: No redirect to /profile and no error message found');
    }

    // Verify we're logged in by checking we're on /profile
    await expect(page).toHaveURL(/\/profile/);
}

export async function register(
    page: Page,
    email: string,
    password: string,
): Promise<void> {
    // Navigate to register page
    await page.goto("/register");

    // Wait for form to be visible and enabled
    await page.waitForSelector("form", { state: "visible" });

    // Fill first name field
    const firstNameInput = page.locator('[data-testid="register-first-name"]');
    await firstNameInput.waitFor({ state: "visible" });
    await firstNameInput.click();
    await firstNameInput.fill("Test");

    // Fill last name field
    const lastNameInput = page.locator('[data-testid="register-last-name"]');
    await lastNameInput.waitFor({ state: "visible" });
    await lastNameInput.click();
    await lastNameInput.fill("User");

    // Fill email field
    const emailInput = page.locator('[data-testid="register-email"]');
    await emailInput.waitFor({ state: "visible" });
    await emailInput.click();
    await emailInput.fill(email);

    // Fill password field
    const passwordInput = page.locator('[data-testid="register-password"]');
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.click();
    await passwordInput.fill(password);

    // Fill confirm password field
    const confirmPasswordInput = page.locator(
        '[data-testid="register-confirm-password"]',
    );
    await confirmPasswordInput.waitFor({ state: "visible" });
    await confirmPasswordInput.click();
    await confirmPasswordInput.fill(password);

    // Agree to terms
    const agreeTermsCheckbox = page.locator(
        '[data-testid="register-agree-terms"]',
    );
    await agreeTermsCheckbox.waitFor({ state: "visible" });
    await agreeTermsCheckbox.check();

    // Submit form
    const submitButton = page.locator('[data-testid="register-submit"]');
    await submitButton.waitFor({ state: "visible" });
    await submitButton.click();

    // Wait for either navigation to profile, success message, or error message
    try {
        await page.waitForURL("**/profile/info", { timeout: 3000 });
        console.log("Registration successful - redirected to profile");
    } catch {
        // Check for various possible outcomes
        await page.waitForTimeout(2000); // Give time for messages to appear

        const currentURL = page.url();
        console.log("Current URL after registration:", currentURL);

        // Check for success message
        const successMessage = page.locator("text=Account aangemaakt");
        if (await successMessage.isVisible({ timeout: 1000 })) {
            console.log("Success message found: Account aangemaakt");
            return; // Registration successful, email confirmation may be required
        }

        // Check for email confirmation message
        const emailMessage = page.locator("text=Check your email").or(
            page.locator("text=email"),
        );
        if (await emailMessage.isVisible({ timeout: 1000 })) {
            console.log("Email confirmation required");
            return; // Email confirmation required
        }

        // Check for error message
        const errorElement = page.locator('[class*="text-red"]');
        if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent();
            throw new Error(`Registration failed: ${errorText}`);
        }

        // If none of the above, something unexpected happened
        throw new Error(
            "Registration completed but no expected outcome detected",
        );
    }
}

export async function login(
    page: Page,
    email: string,
    password: string,
): Promise<void> {
    // Navigate to login page
    await page.goto("/login");

    // Wait for form to be visible and enabled
    await page.waitForSelector("form", { state: "visible" });

    // Fill email field
    const emailInput = page.locator('[data-testid="login-email"]');
    await emailInput.waitFor({ state: "visible" });
    await emailInput.click();
    await emailInput.fill(email);

    // Fill password field
    const passwordInput = page.locator('[data-testid="login-password"]');
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.click();
    await passwordInput.fill(password);

    // Submit form
    const submitButton = page.locator('[data-testid="login-submit"]');
    await submitButton.waitFor({ state: "visible" });
    await submitButton.click();

    // Wait for navigation (either to home or profile)
    await page.waitForURL(
        (url) => url.pathname === "/" || url.pathname.startsWith("/profile"),
        { timeout: 10000 },
    );
}

export async function logout(page: Page): Promise<void> {
    // Try to find logout button in mobile menu first
    try {
        // Open mobile menu if it exists
        const menuButton = page.locator('button[aria-label="Menu openen"]');
        if (await menuButton.isVisible()) {
            await menuButton.click();
        }

        // Look for logout button with Dutch text
        const logoutButton = page.locator('button:has-text("Uitloggen")');
        await logoutButton.waitFor({ state: "visible", timeout: 2000 });
        await logoutButton.click();

        // Wait for redirect to login
        await page.waitForURL("**/login", { timeout: 5000 });
    } catch {
        // Fallback: navigate directly to logout endpoint
        await page.goto("/logout");
        await page.waitForURL("**/login", { timeout: 5000 });
    }
}
