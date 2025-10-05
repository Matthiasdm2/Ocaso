"use client";

import { useEffect } from "react";

interface ShopPageProps {
  params: {
    slug: string;
  };
}

export default function ShopPage({ params }: ShopPageProps) {
  const { slug } = params;

  useEffect(() => {
    // Track shop view when component mounts
    const trackShopView = async () => {
      try {
        await fetch('/api/shop-views', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shop_slug: slug }),
        });
      } catch (error) {
        console.error('Failed to track shop view:', error);
      }
    };

    trackShopView();
  }, [slug]);

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Shop: {slug}</h1>
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-xl font-semibold mb-2">Shop pagina voor {slug}</h2>
          <p className="text-gray-600 mb-4">
            Deze shop wordt nu getrackt voor trending statistieken.
          </p>
          <p className="text-sm text-gray-500">
            Shop view is geregistreerd bij het laden van deze pagina.
          </p>
        </div>
      </div>
    </div>
  );
}