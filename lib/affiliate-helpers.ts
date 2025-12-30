/**
 * Affiliate permission & recommendation helpers
 * 
 * Strict rules:
 * - Affiliates ONLY for private (non-business) users
 * - Server-side enforcement prevents data leakage to business accounts
 * - Feature flag allows disable in production
 */

import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Determine if user can view affiliate content
 * Strict rules: only private users see affiliates
 */
export function canShowAffiliates(profile: Profile | null | undefined): boolean {
  if (!profile) return false;

  // Feature flag check
  const affiliateEnabled = process.env.NEXT_PUBLIC_AFFILIATE_ENABLED !== 'false';
  if (!affiliateEnabled) return false;

  // Business check: both account_type and is_business
  const isBusinessAccount = profile.account_type === 'business' || profile.is_business === true;
  if (isBusinessAccount) return false;

  return true;
}

/**
 * Check if profile is a business account
 * Consistent helper used across codebase
 */
export function isBusinessProfile(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return profile.account_type === 'business' || profile.is_business === true;
}

// Types
export interface AffiliateProduct {
  title: string;
  price: string;
  retailer: string;
  url: string;
  image_url?: string;
  sponsored?: boolean;
}
