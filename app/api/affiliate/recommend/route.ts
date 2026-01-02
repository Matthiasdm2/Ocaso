/**
 * GET /api/affiliate/recommend
 * 
 * Affiliate product recommendations endpoint
 * Strict: ONLY for private (non-business) users
 * Business users get empty response
 */

import { NextResponse } from 'next/server';

import type { AffiliateProduct } from '@/lib/affiliate-helpers';
import { supabaseServer } from '@/lib/supabaseServer';

const AFFILIATE_ENABLED = process.env.NEXT_PUBLIC_AFFILIATE_ENABLED !== 'false';

// Mock provider: static recommendations per category/keyword
const mockAffiliateProducts: Record<string, AffiliateProduct[]> = {
  // Electronics
  'electronics': [
    {
      title: 'Wireless Headphones Pro',
      price: '€89.99',
      retailer: 'TechStore',
      url: 'https://example.com/headphones',
      image_url: 'https://via.placeholder.com/100',
      sponsored: true,
    },
    {
      title: 'USB-C Cable 2m',
      price: '€12.99',
      retailer: 'ElectroWorld',
      url: 'https://example.com/cable',
      image_url: 'https://via.placeholder.com/100',
      sponsored: true,
    },
  ],
  // Fashion
  'fashion': [
    {
      title: 'Casual T-Shirt',
      price: '€24.99',
      retailer: 'FashionHub',
      url: 'https://example.com/tshirt',
      image_url: 'https://via.placeholder.com/100',
      sponsored: true,
    },
  ],
  // Books
  'books': [
    {
      title: 'Bestseller Novel',
      price: '€16.99',
      retailer: 'BookStore',
      url: 'https://example.com/book',
      image_url: 'https://via.placeholder.com/100',
      sponsored: true,
    },
  ],
};

/**
 * Get recommendations for a search query
 * Mock provider returns static products per category
 */
function getRecommendations(
  query: string,
  category?: string,
  limit: number = 5
): AffiliateProduct[] {
  const normalizedQuery = query.toLowerCase();
  const normalizedCategory = category?.toLowerCase();

  // First try category match
  if (normalizedCategory && mockAffiliateProducts[normalizedCategory]) {
    return mockAffiliateProducts[normalizedCategory].slice(0, limit);
  }

  // Then try keyword match in query
  for (const [key, products] of Object.entries(mockAffiliateProducts)) {
    if (normalizedQuery.includes(key)) {
      return products.slice(0, limit);
    }
  }

  // Default fallback
  return Object.values(mockAffiliateProducts)
    .flat()
    .slice(0, limit);
}

export async function GET(request: Request) {
  try {
    // Auth check: user must be logged in
    const supabase = supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', products: [] },
        { status: 401 }
      );
    }

    // Feature flag check
    if (!AFFILIATE_ENABLED) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Affiliate API] Feature disabled');
      }
      return NextResponse.json({ products: [] });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_type, is_business')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', products: [] },
        { status: 404 }
      );
    }

    // STRICT BUSINESS GATE: business users NEVER get affiliate data
    // Check business status directly since we only selected these fields
    const isBusiness = profile.account_type === 'business' || profile.is_business === true;
    if (isBusiness) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Affiliate API] Business user blocked:', user.id);
      }
      // Return 200 with empty array (don't reveal it's intentional)
      return NextResponse.json({ products: [] });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;
    const limitStr = searchParams.get('limit') || '5';
    const limit = Math.min(parseInt(limitStr, 10), 5); // Max 5

    if (process.env.NODE_ENV === 'development') {
      console.log('[Affiliate API] Request from private user:', {
        userId: user.id,
        query: q,
        category,
        limit,
      });
    }

    // Get recommendations from mock provider
    const products = getRecommendations(q, category, limit);

    // Optional: log impression event for analytics
    if (products.length > 0) {
      // Log in background (don't await, don't block response)
      logAffiliateEvent(user.id, 'impression', q).catch(err => {
        console.error('[Affiliate] Event log error:', err);
      });
    }

    return NextResponse.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('[Affiliate API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', products: [] },
      { status: 500 }
    );
  }
}

/**
 * Log affiliate event (impression/click)
 * Async, non-blocking
 */
async function logAffiliateEvent(
  userId: string,
  eventType: 'impression' | 'click',
  query: string
): Promise<void> {
  try {
    const supabase = supabaseServer();
    // affiliate_events table may not exist in Database types, use type assertion
    await (supabase.from('affiliate_events' as never) as any).insert({
      user_id: userId,
      event_type: eventType,
      query,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Silently fail - don't impact user experience
    if (process.env.NODE_ENV === 'development') {
      console.error('[Affiliate] Event logging failed:', error);
    }
  }
}
