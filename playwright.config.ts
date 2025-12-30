import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

// Load environment variables ONLY from tests/.env.e2e.local
dotenv.config({ path: "tests/.env.e2e.local" });

/**
 * ENV GUARDS: Ensure required environment variables are set for E2E tests
 * Fail fast if configuration is invalid (prevents misleading test failures)
 */
function validateE2EEnvironment() {
  const errors: string[] = [];

  // Check Supabase URL is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set in tests/.env.e2e.local');
  } else if (process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost:8000')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL points to localhost:8000 (should be production/staging)');
  }

  // Check Supabase Anon Key is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in tests/.env.e2e.local');
  }

  // Check affiliate feature flag
  if (process.env.NEXT_PUBLIC_AFFILIATE_ENABLED === undefined) {
    console.warn('⚠️  NEXT_PUBLIC_AFFILIATE_ENABLED not set, defaulting to feature enabled');
  }

  if (errors.length > 0) {
    throw new Error(
      `❌ E2E Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\nRequired file: tests/.env.e2e.local`
    );
  }

  console.log('✅ E2E environment validated successfully');
}

// Run validation (will fail fast if env is invalid)
validateE2EEnvironment();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: "./tests/e2e",
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: process.env.CI ? [["github"], ["html"]] : "html",
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        /* CANONICAL: Must be http://localhost:3000 (no fallback) */
        baseURL: "http://localhost:3000",

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: "on-first-retry",

        /* Take screenshot on failure for debugging */
        screenshot: "only-on-failure",

        /* Record video on failure for debugging */
        video: "retain-on-failure",
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: "setup",
            testMatch: "**/auth.setup.ts",
            use: {
                ...devices["Desktop Chrome"],
                launchOptions: {
                    args: ["--disable-web-security"],
                },
            },
        },
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                launchOptions: {
                    args: ["--disable-web-security"],
                },
                storageState: "playwright/.auth/user.json",
            },
            dependencies: ["setup"],
        },

        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },

        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },

        /* Test against mobile viewports. */
        {
            name: "Mobile Chrome",
            use: { ...devices["Pixel 5"] },
        },
        {
            name: "Mobile Safari",
            use: { ...devices["iPhone 12"] },
        },
        /* Test against branded browsers. */
        // {
        //   name: 'Microsoft Edge',
        //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
        // },
        // {
        //   name: 'Google Chrome',
        //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        // },
    ],
    /* Run your local dev server before starting the tests */
    webServer: {
      command: 'npm run dev -- --port 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,  // 120 seconds to start server
      stdout: 'pipe',       // Show server output for debugging
      stderr: 'pipe',       // Show server errors for debugging
    },
});
