import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEntitlementsForSeller } from "../lib/domain/subscriptions";
import { createClient } from "../lib/supabase/server";

// Mock the createClient function
vi.mock("../lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("Subscriptions - Entitlements & Gating", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getEntitlementsForSeller", () => {
        it("returns default entitlements when no subscription exists", async () => {
            // Mock no subscription found
            const mockQueryBuilder = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn(() =>
                    Promise.resolve({ data: null, error: null })
                ),
            };

            const mockSupabase = {
                from: vi.fn(() => mockQueryBuilder),
            };

            vi.mocked(createClient).mockReturnValue(mockSupabase as never);

            const entitlements = await getEntitlementsForSeller("user-123");

            expect(entitlements).toEqual({
                max_active_listings: 1,
                max_active_boosts: 0,
                boost_discount_percentage: 0,
                included_qr_credits_monthly: 0,
                qr_credit_rollover: false,
                premium_listing_badge: false,
                analytics_dashboard: false,
                priority_support: false,
            });
        });

        it("returns basic plan entitlements for active basic subscription", async () => {
            // Mock active basic subscription
            const mockQueryBuilder = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn(() =>
                    Promise.resolve({
                        data: {
                            plan_id: "basic-plan-id",
                            subscription_plans: { name: "Basic" },
                        },
                        error: null,
                    })
                ),
            };

            const mockSupabase = {
                from: vi.fn(() => mockQueryBuilder),
            };

            vi.mocked(createClient).mockReturnValue(mockSupabase as never);

            const entitlements = await getEntitlementsForSeller("user-123");

            expect(entitlements).toEqual({
                max_active_listings: 5,
                max_active_boosts: 1,
                boost_discount_percentage: 0,
                included_qr_credits_monthly: 10,
                qr_credit_rollover: false,
                premium_listing_badge: false,
                analytics_dashboard: false,
                priority_support: false,
            });
        });
    });
});
