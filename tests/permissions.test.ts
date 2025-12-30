import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the supabase client
vi.mock("../lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
        })),
    })),
}));

// Import after mocking
import {
    canCreateBoost,
    canCreateListing,
    canUseQRCredit,
    enforceCanCreateBoost,
    enforceCanCreateListing,
    getBoostDiscount,
    hasAnalyticsAccess,
    hasPremiumBadge,
    hasPrioritySupport,
} from "../lib/domain/gating";

// Mock the subscriptions module
vi.mock("../lib/domain/subscriptions", () => ({
    getEntitlementsAndUsage: vi.fn(),
}));

import { getEntitlementsAndUsage } from "../lib/domain/subscriptions";

describe("Permissions Helpers", () => {
    const mockGetEntitlementsAndUsage = vi.mocked(getEntitlementsAndUsage);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("canCreateListing", () => {
        it("returns true when within listing limit", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 2,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: {
                        used: 1,
                        limit: 1,
                        withinLimit: false,
                    },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 2,
                    active_boosts: 1,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canCreateListing("user-123");
            expect(result).toBe(true);
            expect(mockGetEntitlementsAndUsage).toHaveBeenCalledWith(
                "user-123",
                undefined,
            );
        });

        it("returns false when exceeding listing limit", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 5,
                        limit: 5,
                        withinLimit: false,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 5,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canCreateListing("user-123");
            expect(result).toBe(false);
        });

        it("passes organizationId to entitlements check", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 2,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: {
                        used: 1,
                        limit: 1,
                        withinLimit: false,
                    },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 2,
                    active_boosts: 1,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            await canCreateListing("user-123", "org-456");
            expect(mockGetEntitlementsAndUsage).toHaveBeenCalledWith(
                "user-123",
                "org-456",
            );
        });
    });

    describe("canCreateBoost", () => {
        it("returns true when within boost limit", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: false,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canCreateBoost("user-123");
            expect(result).toBe(true);
        });

        it("returns false when exceeding boost limit", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: {
                        used: 1,
                        limit: 1,
                        withinLimit: false,
                    },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 1,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canCreateBoost("user-123");
            expect(result).toBe(false);
        });
    });

    describe("canUseQRCredit", () => {
        it("returns true when sufficient credits available", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 5,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 5,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canUseQRCredit("user-123", undefined, 3);
            expect(result).toBe(true); // 10 - 5 = 5 remaining, 3 needed
        });

        it("returns false when insufficient credits", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 8,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 8,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canUseQRCredit("user-123", undefined, 3);
            expect(result).toBe(false); // 10 - 8 = 2 remaining, 3 needed
        });

        it("defaults to amount 1 when not specified", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 9,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 9,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await canUseQRCredit("user-123");
            expect(result).toBe(true); // 10 - 9 = 1 remaining, 1 needed
        });
    });

    describe("getBoostDiscount", () => {
        it("returns the boost discount percentage", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 25,
                        limit: 25,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 25,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await getBoostDiscount("user-123");
            expect(result).toBe(25);
        });
    });

    describe("hasPremiumBadge", () => {
        it("returns true when premium badge entitlement exists", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 1,
                        limit: 1,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: true,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await hasPremiumBadge("user-123");
            expect(result).toBe(true);
        });

        it("returns false when no premium badge entitlement", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await hasPremiumBadge("user-123");
            expect(result).toBe(false);
        });
    });

    describe("hasAnalyticsAccess", () => {
        it("returns true when analytics dashboard entitlement exists", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 1,
                        limit: 1,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: true,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            const result = await hasAnalyticsAccess("user-123");
            expect(result).toBe(true);
        });
    });

    describe("hasPrioritySupport", () => {
        it("returns true when priority support entitlement exists", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 1, limit: 1, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: true,
                    qr_credit_rollover: false,
                },
            });

            const result = await hasPrioritySupport("user-123");
            expect(result).toBe(true);
        });
    });

    describe("enforceCanCreateListing", () => {
        it("does not throw when user can create listing", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: {
                        used: 0,
                        limit: 1,
                        withinLimit: false,
                    },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            await expect(enforceCanCreateListing("user-123")).resolves.not
                .toThrow();
        });

        it("throws error when user cannot create listing", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 5,
                        limit: 5,
                        withinLimit: false,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 5,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            await expect(enforceCanCreateListing("user-123")).rejects.toThrow(
                "Maximum active listings limit reached. Upgrade your plan to create more listings.",
            );
        });
    });

    describe("enforceCanCreateBoost", () => {
        it("does not throw when user can create boost", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: false,
                    },
                    max_active_boosts: { used: 0, limit: 1, withinLimit: true },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 0,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            await expect(enforceCanCreateBoost("user-123")).resolves.not
                .toThrow();
        });

        it("throws error when user cannot create boost", async () => {
            mockGetEntitlementsAndUsage.mockResolvedValue({
                limits: {
                    max_active_listings: {
                        used: 0,
                        limit: 5,
                        withinLimit: true,
                    },
                    max_active_boosts: {
                        used: 1,
                        limit: 1,
                        withinLimit: false,
                    },
                    boost_discount_percentage: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    included_qr_credits_monthly: {
                        used: 0,
                        limit: 10,
                        withinLimit: true,
                    },
                    qr_credit_rollover: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    premium_listing_badge: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    analytics_dashboard: {
                        used: 0,
                        limit: 0,
                        withinLimit: true,
                    },
                    priority_support: { used: 0, limit: 0, withinLimit: true },
                },
                usage: {
                    active_listings: 0,
                    active_boosts: 1,
                    qr_credits_used_this_month: 0,
                },
                entitlements: {
                    max_active_listings: 5,
                    max_active_boosts: 1,
                    included_qr_credits_monthly: 10,
                    boost_discount_percentage: 0,
                    premium_listing_badge: false,
                    analytics_dashboard: false,
                    priority_support: false,
                    qr_credit_rollover: false,
                },
            });

            await expect(enforceCanCreateBoost("user-123")).rejects.toThrow(
                "Maximum active boosts limit reached. Upgrade your plan to create more boosts.",
            );
        });
    });
});
