"use client";

import { useEffect, useState } from "react";

import { belgianLocations } from "@/lib/belgianLocations";

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function LocationSelect({ value, onChange, placeholder = "Zoek op postcode of gemeente..." }: LocationSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLocations, setFilteredLocations] = useState<typeof belgianLocations>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = belgianLocations.filter(location =>
        location.postcode.toString().includes(searchTerm) ||
        location.gemeente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.provincie.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10); // Limit to 10 results
      setFilteredLocations(filtered);
      setShowDropdown(true);
    } else {
      setFilteredLocations([]);
      setShowDropdown(false);
    }
  }, [searchTerm]);

  const handleSelect = (location: typeof belgianLocations[0]) => {
    const locationString = `${location.postcode} ${location.gemeente}`;
    onChange(locationString);
    setSearchTerm(locationString);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm || value}
        onChange={handleInputChange}
        onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
        placeholder={placeholder}
      />
      {showDropdown && filteredLocations.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
          {filteredLocations.map((location, index) => (
            <button
              key={`${location.postcode}-${location.gemeente}-${index}`}
              type="button"
              onClick={() => handleSelect(location)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-sm"
            >
              <div className="font-medium">{location.postcode} {location.gemeente}</div>
              <div className="text-gray-500 text-xs">{location.provincie}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
