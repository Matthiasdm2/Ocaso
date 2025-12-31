"use client";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getVehicleBrandsByCategorySlug, isVehicleCategory, type VehicleBrand } from '@/lib/services/category.service';

/**
 * VehicleBrandFilter - Shows brand filter for vehicle categories
 * Only visible when a vehicle category is active (autos, motos, bedrijfsvoertuigen, campers)
 */
export default function VehicleBrandFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(false);
  
  const currentCategory = searchParams.get('category') || '';
  const currentBrand = searchParams.get('brand') || '';
  
  // Only show for vehicle categories
  const showBrandFilter = isVehicleCategory(currentCategory);

  useEffect(() => {
    async function loadBrands() {
      if (!showBrandFilter || !currentCategory) {
        setBrands([]);
        return;
      }

      try {
        setLoading(true);
        const vehicleBrands = await getVehicleBrandsByCategorySlug(currentCategory);
        setBrands(vehicleBrands);
      } catch (error) {
        console.error('Failed to load vehicle brands:', error);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    }

    loadBrands();
  }, [currentCategory, showBrandFilter]);

  const handleBrandSelect = (brandSlug: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    if (brandSlug === currentBrand) {
      // Deselect current brand
      newParams.delete('brand');
    } else {
      // Select new brand
      newParams.set('brand', brandSlug);
    }

    router.push(`${pathname}?${newParams.toString()}`);
  };

  if (!showBrandFilter || brands.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
      <h3 className="font-medium text-gray-900 mb-3">Merk</h3>
      
      {loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Clear filter option */}
          {currentBrand && (
            <button
              onClick={() => handleBrandSelect('')}
              className="flex items-center justify-between w-full px-2 py-1 text-sm text-primary hover:bg-primary/5 rounded"
            >
              <span>Alle merken</span>
              <span className="text-xs text-gray-400">×</span>
            </button>
          )}
          
          {/* Brand options */}
          {brands.slice(0, 25).map((brand) => {
            const isSelected = brand.slug === currentBrand;
            
            return (
              <button
                key={brand.id}
                onClick={() => handleBrandSelect(brand.slug)}
                className={`flex items-center justify-between w-full px-2 py-1 text-sm rounded transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{brand.name}</span>
                {isSelected && (
                  <span className="text-xs">✓</span>
                )}
              </button>
            );
          })}
          
          {brands.length > 25 && (
            <div className="text-xs text-gray-500 px-2 pt-2 border-t">
              Top 25 merken getoond
            </div>
          )}
        </div>
      )}
    </div>
  );
}
