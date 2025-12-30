import { test } from "@playwright/test";

test.describe("Environment Guard", () => {
    test("should have correct Supabase Cloud URL", () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
        if (!url.startsWith("https://")) throw new Error("NEXT_PUBLIC_SUPABASE_URL must start with https://");
        if (!url.includes("dmnowaqinfkhovhyztan.supabase.co")) throw new Error("NEXT_PUBLIC_SUPABASE_URL must contain dmnowaqinfkhovhyztan.supabase.co");
        if (url.includes("localhost:8000")) throw new Error("NEXT_PUBLIC_SUPABASE_URL must not contain localhost:8000");
    });

    test("should have correct test email", () => {
        const email = process.env.E2E_TEST_EMAIL;
        if (!email) throw new Error("E2E_TEST_EMAIL is not set");
        if (email !== "info@ocaso.be") throw new Error("E2E_TEST_EMAIL must be info@ocaso.be");
    });

    test("should have required env vars", () => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
        if (!process.env.E2E_TEST_PASSWORD) throw new Error("E2E_TEST_PASSWORD is not set");
    });
});
