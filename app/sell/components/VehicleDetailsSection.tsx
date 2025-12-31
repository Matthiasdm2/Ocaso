"use client";

import { useEffect, useState } from "react";

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface VehicleFilter {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
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

  // Fetch vehicle filters when category changes
  useEffect(() => {
    async function fetchFilters() {
      if (!categorySlug || !isVehicleCategorySlug(categorySlug)) {
        setFilters([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/categories/filters?category=${categorySlug}`);
        if (response.ok) {
          const data = await response.json();
          setFilters(data || []);
        } else {
          console.warn(`Failed to fetch vehicle filters for ${categorySlug}:`, response.status);
          setFilters([]);
        }
      } catch (error) {
        console.error("Error fetching vehicle filters:", error);
        setFilters([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFilters();
  }, [categorySlug]);

  // Helper to check if slug is vehicle category
  function isVehicleCategorySlug(slug: string): boolean {
    return ["auto-motor", "bedrijfswagens", "camper-mobilhomes"].includes(slug);
  }

  // Handle form field changes
  const handleFieldChange = (fieldType: string, value: string) => {
    const updatedDetails = {
      ...vehicleDetails,
      [fieldType]: value
    };
    onDetailsChange(updatedDetails);
  };

  // Don't render if not a vehicle category
  if (!categorySlug || !isVehicleCategorySlug(categorySlug)) {
    return null;
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voertuiggegevens</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!filters.length) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voertuiggegevens</h3>
        <p className="text-gray-500">Geen voertuiggegevens beschikbaar voor deze categorie.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Voertuiggegevens</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filters.map((filter) => {
          const currentValue = vehicleDetails[filter.type] || "";

          if (filter.type === "select" && filter.options) {
            return (
              <div key={filter.id} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                <select
                  value={currentValue}
                  onChange={(e) => handleFieldChange(filter.type, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecteer {filter.label.toLowerCase()}</option>
                  {filter.options.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (filter.type === "number") {
            return (
              <div key={filter.id} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => handleFieldChange(filter.type, e.target.value)}
                  placeholder={filter.placeholder}
                  min={filter.min}
                  max={filter.max}
                  step={filter.step}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            );
          }

          // Default to text input
          return (
            <div key={filter.id} className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </label>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleFieldChange(filter.type, e.target.value)}
                placeholder={filter.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
