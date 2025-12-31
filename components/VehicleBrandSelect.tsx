"use client";
import { useEffect, useState } from 'react';

import { getVehicleBrandsByCategorySlug, isVehicleCategory, type VehicleBrand } from '@/lib/services/category.service';

type Props = {
  categorySlug: string;
  value: string; // selected brand id
  onChange: (brandId: string) => void;
  disabled?: boolean;
  required?: boolean;
};

/**
 * VehicleBrandSelect - Brand selector for vehicle categories
 * Only shown when a vehicle category is selected
 */
export default function VehicleBrandSelect({ 
  categorySlug, 
  value, 
  onChange, 
  disabled = false, 
  required = false 
}: Props) {
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Only show for vehicle categories
  const showBrandSelect = isVehicleCategory(categorySlug);

  useEffect(() => {
    async function loadBrands() {
      if (!showBrandSelect || !categorySlug) {
        setBrands([]);
        return;
      }

      try {
        setLoading(true);
        const vehicleBrands = await getVehicleBrandsByCategorySlug(categorySlug);
        setBrands(vehicleBrands);
      } catch (error) {
        console.error('Failed to load vehicle brands:', error);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    }

    loadBrands();
  }, [categorySlug, showBrandSelect]);

  // Reset brand selection when category changes
  useEffect(() => {
    if (!showBrandSelect && value) {
      onChange('');
    }
  }, [showBrandSelect, value, onChange]);

  if (!showBrandSelect) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        Voertuigmerk {required && <span className="text-red-500">*</span>}
      </label>
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-100 rounded-lg"></div>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || brands.length === 0}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {brands.length === 0 ? 'Geen merken beschikbaar' : 'Selecteer een merk'}
          </option>
          
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      )}
      
      {brands.length === 0 && !loading && showBrandSelect && (
        <p className="text-xs text-gray-500">
          Geen merken gevonden voor deze categorie
        </p>
      )}
      
      {brands.length > 0 && (
        <p className="text-xs text-gray-500">
          {brands.length} merken beschikbaar
        </p>
      )}
    </div>
  );
}
