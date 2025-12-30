import { test as setup } from "@playwright/test";

import { authenticateTestUser } from "./helpers/auth";

setup("authenticate", async ({ page }) => {
    // Authenticate the test user and save session state
    await authenticateTestUser(page);

    // Save the authentication state
    await page.context().storageState({ path: "playwright/.auth/user.json" });
});
