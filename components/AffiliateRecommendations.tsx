/**
 * AffiliateRecommendations Component
 * 
 * Subtile affiliate product recommendations
 * Only rendered for private users, only shown after search
 * Frequency capped via localStorage
 */

'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import type { AffiliateProduct } from '@/lib/affiliate-helpers';

interface Props {
  query?: string;
  category?: string;
  maxItems?: number;
  className?: string;
}

const FREQUENCY_CAP_KEY = 'affiliate:lastShown';
const FREQUENCY_CAP_MS = 3600000; // 1 hour

export function AffiliateRecommendations({
  query,
  category,
  maxItems = 3,
  className = '',
}: Props) {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showedRecently, setShowedRecently] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query!,
        limit: String(maxItems),
      });
      if (category) params.append('category', category);

      const response = await fetch(`/api/affiliate/recommend?${params}`);
      if (!response.ok) {
        console.error('[Affiliate] API error:', response.status);
        setProducts([]);
        return;
      }

      const data = await response.json();
      const fetchedProducts = data.products || [];

      if (fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
        // Mark that we showed affiliates
        localStorage.setItem(FREQUENCY_CAP_KEY, String(Date.now()));
      }
    } catch (error) {
      console.error('[Affiliate] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, category, maxItems]);

  useEffect(() => {
    // Frequency cap: don't show if we showed recently
    const lastShown = localStorage.getItem(FREQUENCY_CAP_KEY);
    if (lastShown && Date.now() - parseInt(lastShown) < FREQUENCY_CAP_MS) {
      setShowedRecently(true);
      return;
    }

    // Only fetch if we have a query
    if (!query || query.trim().length === 0) {
      return;
    }

    fetchRecommendations();
  }, [query, category, maxItems, fetchRecommendations]);

  // Don't render if no products or frequency capped
  if (products.length === 0 || showedRecently || isLoading) {
    return null;
  }

  return (
    <div
      data-testid="affiliate-block"
      className={`my-6 rounded-lg border border-amber-100 bg-amber-50 p-4 ${className}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Aanbevolen alternatieven
        </h3>
        <span className="text-xs text-gray-500">Gesponsord</span>
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {products.slice(0, maxItems).map((product, idx) => (
          <a
            key={idx}
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded border border-amber-200 bg-white p-2 text-sm transition hover:border-amber-300 hover:shadow-sm"
          >
            <div className="flex gap-2">
              {/* Image */}
              {product.image_url && (
                <Image
                  src={product.image_url}
                  alt={product.title}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                />
              )}
              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800 group-hover:text-amber-700">
                  {product.title}
                </p>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{product.retailer}</span>
                  <span className="font-semibold text-gray-800">
                    {product.price}
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer: disclosure */}
      <p className="mt-3 text-xs text-gray-500">
        Deze aanbevelingen zijn gesponsord. Ocaso verdient commissie
        zonder extra kosten voor jou.
      </p>
    </div>
  );
}
