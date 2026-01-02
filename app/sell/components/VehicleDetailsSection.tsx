"use client";

import { useEffect, useState } from "react";

// Filter format zoals teruggegeven door /api/categories/filters
interface VehicleFilter {
  id: number | string;
  filter_key: string;
  filter_label: string;
  filter_options: string[];
  placeholder?: string;
  input_type: 'select' | 'range' | 'number' | 'text';
  is_range: boolean;
  min_value?: number;
  max_value?: number;
  sort_order?: number;
}

interface VehicleDetailsProps {
  categorySlug: string;
  vehicleDetails: Record<string, string>;
  onDetailsChange: (details: Record<string, string>) => void;
}

export function VehicleDetailsSection({ 
  categorySlug, 
  vehicleDetails, 
  onDetailsChange 
}: VehicleDetailsProps) {
  const [filters, setFilters] = useState<VehicleFilter[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debug: log when vehicleDetails prop changes
  useEffect(() => {
    console.log('[VehicleDetailsSection] vehicleDetails prop changed:', vehicleDetails);
    console.log('[VehicleDetailsSection] categorySlug:', categorySlug);
    console.log('[VehicleDetailsSection] filters count:', filters.length);
  }, [vehicleDetails, categorySlug, filters]);

  // Fetch vehicle filters when category changes
  useEffect(() => {
    async function fetchFilters() {
      if (!categorySlug || !isVehicleCategorySlug(categorySlug)) {
        setFilters([]);
        return;
      }

      try {
        setLoading(true);
        console.log('[VEHICLE_DETAILS] Fetching filters for:', categorySlug);
        const response = await fetch(`/api/categories/filters?category=${categorySlug}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[VEHICLE_DETAILS] Received filters:', data);
          
          // API geeft { category, filters } terug
          if (data.filters && Array.isArray(data.filters)) {
            console.log('[VEHICLE_DETAILS] Setting filters:', data.filters.map((f: { filter_key?: string; filter_label?: string }) => ({ key: f.filter_key, label: f.filter_label })));
            setFilters(data.filters);
          } else if (Array.isArray(data)) {
            // Fallback: als data direct een array is
            console.log('[VEHICLE_DETAILS] Setting filters (array):', data.map((f: { filter_key?: string; filter_label?: string }) => ({ key: f.filter_key, label: f.filter_label })));
            setFilters(data);
          } else {
            console.warn('[VEHICLE_DETAILS] Unexpected response format:', data);
            setFilters([]);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`[VEHICLE_DETAILS] Failed to fetch filters for ${categorySlug}:`, response.status, errorData);
          setFilters([]);
        }
      } catch (error) {
        console.error("[VEHICLE_DETAILS] Error fetching vehicle filters:", error);
        setFilters([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFilters();
  }, [categorySlug]);

  // Helper to check if slug is vehicle category
  function isVehicleCategorySlug(slug: string): boolean {
    return [
      "auto-motor",
      "auto-s",
      "bedrijfswagens", 
      "camper-mobilhomes",
      "motoren-en-scooters",
      "motoren"
    ].includes(slug);
  }

  // Helper to clean labels (remove underscores)
  const cleanLabel = (label: string): string => {
    return label.replace(/_/g, ' ');
  };

  // Handle form field changes
  const handleFieldChange = (filterKey: string, value: string) => {
    const updatedDetails = {
      ...vehicleDetails,
      [filterKey]: value
    };
    onDetailsChange(updatedDetails);
  };


  // Don't render if not a vehicle category
  if (!categorySlug || !isVehicleCategorySlug(categorySlug)) {
    return null;
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voertuiggegevens</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </section>
    );
  }

  if (!filters.length) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voertuiggegevens</h3>
        <p className="text-gray-500">Geen voertuiggegevens beschikbaar voor deze categorie.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Voertuiggegevens</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filters.map((filter) => {
          const filterKey = filter.filter_key;
          const currentValue = vehicleDetails[filterKey] || "";
          const currentMin = vehicleDetails[`${filterKey}_min`] || "";
          const currentMax = vehicleDetails[`${filterKey}_max`] || "";
          
          // Debug logging for each filter
          console.log(`[VehicleDetailsSection] Filter: ${filterKey}, Label: ${filter.filter_label}, Value:`, currentValue, 'All vehicleDetails:', vehicleDetails);

          // Number input voor exacte waarden (bouwjaar, kilometerstand, vermogen)
          // Bij plaatsen gebruiken we exacte waarden, geen ranges
          if (filter.is_range || filter.input_type === 'range' || filter.input_type === 'number') {
            // Voor bouwjaar, kilometerstand, vermogen: gebruik single number input
            const isYear = filterKey === 'bouwjaar' || filterKey === 'year';
            const isMileage = filterKey === 'kilometerstand' || filterKey === 'mileage_km';
            const isPower = filterKey === 'vermogen' || filterKey === 'power_hp';
            
            return (
              <div key={filter.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {cleanLabel(filter.filter_label)}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleFieldChange(filterKey, e.target.value)}
                    placeholder={
                      isYear ? "Bijv. 2018" :
                      isMileage ? "Bijv. 45000" :
                      isPower ? "Bijv. 150" :
                      filter.placeholder || "Voer waarde in"
                    }
                    min={filter.min_value}
                    max={filter.max_value}
                    step={isYear ? 1 : (isMileage ? 1000 : 1)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                  />
                  {isMileage && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">km</span>
                  )}
                  {isPower && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">pk</span>
                  )}
                </div>
              </div>
            );
          }

          // Select dropdown (voor brandstof, carrosserie, transmissie, etc.)
          if (filter.input_type === 'select' && filter.filter_options && filter.filter_options.length > 0) {
            // Normalize current value for matching (case-insensitive, trim whitespace)
            const normalizedCurrentValue = currentValue?.toString().trim().toLowerCase() || '';
            
            // Find matching option (case-insensitive)
            let matchedValue = '';
            if (normalizedCurrentValue) {
              const matchedOption = filter.filter_options.find((opt: string) => {
                const normalizedOpt = opt?.toString().trim().toLowerCase() || '';
                return normalizedOpt === normalizedCurrentValue || 
                       normalizedOpt.includes(normalizedCurrentValue) ||
                       normalizedCurrentValue.includes(normalizedOpt);
              });
              if (matchedOption) {
                matchedValue = matchedOption;
              } else {
                // If no exact match, try to use the current value as-is
                matchedValue = currentValue;
              }
            }
            
            console.log(`[VehicleDetailsSection] Select filter ${filterKey}: currentValue="${currentValue}", matchedValue="${matchedValue}", options=`, filter.filter_options);
            
            return (
              <div key={filter.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {cleanLabel(filter.filter_label)}
                </label>
                <select
                  value={matchedValue}
                  onChange={(e) => handleFieldChange(filterKey, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">{filter.placeholder || `Selecteer ${cleanLabel(filter.filter_label).toLowerCase()}`}</option>
                  {filter.filter_options.map((option, idx) => (
                    <option key={idx} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }


          // Default text input
          return (
            <div key={filter.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {cleanLabel(filter.filter_label)}
              </label>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleFieldChange(filterKey, e.target.value)}
                placeholder={filter.placeholder}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
