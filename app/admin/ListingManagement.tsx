"use client";

import { useEffect, useState } from "react";

import { formatPrice } from "@/lib/formatPrice";

type Category = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: string;
  subcategory_id?: string;
  state: string;
  location?: string;
  status: string;
  images?: { id: string; image_url: string; is_primary: boolean }[];
};

export default function ListingManagement() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category_id: "",
    subcategory_id: "",
    state: "new",
    location: "",
    status: "actief",
    images: [] as File[],
  });

  // Filter states
  const [filters, setFilters] = useState({
    id: "",
    title: "",
    category_id: "",
    state: "",
    status: "",
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    fetchListings();
    fetchCategories();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetch("/api/admin/listings");
      console.log("Fetch listings response:", res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched listings data:", data);
        // API geeft { ok: true, listings: [] } terug, dus pak de listings array
        const listingsArray = Array.isArray(data.listings) ? data.listings : (Array.isArray(data) ? data : []);
        setListings(listingsArray);
      } else {
        const errorText = await res.text();
        console.error("Failed to fetch listings:", res.status, errorText);
        setListings([]); // Zet lege array bij error
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
      setListings([]); // Zet lege array bij error
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      console.log("Fetch categories response:", response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched categories data:", data);
        setCategories(data);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch categories:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "actief" ? "inactief" : "actief";
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setListings(listings.map(l => l.id === id ? { ...l, status: newStatus } : l));
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Weet je het zeker? Dit zoekertje wordt permanent verwijderd.")) return;
    const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setListings(listings.filter(l => l.id !== id));
    } else {
      alert("Er ging iets mis bij het verwijderen van het zoekertje.");
    }
  };

  const startEditing = (listing: Listing) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      category_id: listing.category_id,
      subcategory_id: listing.subcategory_id || "",
      state: listing.state,
      location: listing.location || "",
      status: listing.status,
      images: [],
    });
  };

  const cancelEditing = () => {
    setEditingListing(null);
    setFormData({
      title: "",
      description: "",
      price: "",
      category_id: "",
      subcategory_id: "",
      state: "gebruikt",
      location: "",
      status: "actief",
      images: [],
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      id: "",
      title: "",
      category_id: "",
      state: "",
      status: "",
      minPrice: "",
      maxPrice: "",
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Onbekend';
  };

  const getConditionLabel = (state: string) => {
    const labels: { [key: string]: string } = {
      'new': 'Nieuw',
      'like_new': 'Zo goed als nieuw',
      'good': 'Goed',
      'fair': 'Redelijk',
      'poor': 'Matig'
    };
    return labels[state] || state;
  };

  // Zorg ervoor dat listings altijd een array is
  const listingsArray = Array.isArray(listings) ? listings : [];
  const filteredListings = listingsArray.filter(listing => {
    // Combined search filter (title or ID)
    const searchTerm = (filters.title || filters.id || "").toLowerCase();
    if (searchTerm && 
        !listing.title.toLowerCase().includes(searchTerm) && 
        !listing.id.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Category filter
    if (filters.category_id && listing.category_id !== filters.category_id) {
      return false;
    }

    // Status filter
    if (filters.status && listing.status !== filters.status) {
      return false;
    }

    // State filter
    if (filters.state && listing.state !== filters.state) {
      return false;
    }

    // Price range filters
    if (filters.minPrice && listing.price < parseFloat(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && listing.price > parseFloat(filters.maxPrice)) {
      return false;
    }

    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      images: files
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setLoading(true);

    try {
      const submitData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'images') {
          (value as File[]).forEach((file) => {
            submitData.append(`images`, file);
          });
        } else {
          submitData.append(key, value as string);
        }
      });

      const response = await fetch(`/api/admin/listings/${editingListing.id}`, {
        method: "PUT",
        body: submitData,
      });

      if (response.ok) {
        alert("Zoekertje succesvol bijgewerkt!");
        await fetchListings();
        cancelEditing();
      } else {
        const error = await response.json();
        alert(`Fout: ${error.message || "Er ging iets mis"}`);
      }
    } catch (error) {
      console.error("Error updating listing:", error);
      alert("Er ging iets mis bij het bijwerken van het zoekertje");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">Laden...</div>
    </div>
  );

  if (editingListing) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-smooth p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Zoekertje Bewerken</h2>
            <button
              onClick={cancelEditing}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              Annuleren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Titel *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Beschrijving *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Prijs (€) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Categorie *</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Selecteer categorie</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Subcategorie</label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Selecteer subcategorie (optioneel)</option>
                {categories
                  .find(cat => cat.id === formData.category_id)
                  ?.subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Conditie *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="new">Nieuw</option>
                <option value="like_new">Zo goed als nieuw</option>
                <option value="good">Goed</option>
                <option value="fair">Redelijk</option>
                <option value="poor">Matig</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="actief">Actief</option>
                <option value="inactief">Inactief</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Locatie</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Nieuwe Afbeeldingen</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <p className="text-sm text-gray-500 mt-2">
                Selecteer nieuwe afbeeldingen om toe te voegen (optioneel)
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary text-black py-3 px-6 font-semibold hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Bezig met bijwerken..." : "Zoekertje Bijwerken"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white rounded-2xl shadow-smooth p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Advertenties</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredListings.length} van {listings.length}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Zoek op titel of ID..."
                value={filters.title || filters.id}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    title: value,
                    id: value
                  }));
                }}
                className="w-full sm:w-64 pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Quick filters */}
            <select
              value={filters.category_id}
              onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
              className="px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Alle categorieën</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Alle statussen</option>
              <option value="actief">Actief</option>
              <option value="inactief">Inactief</option>
            </select>
            
            {(filters.title || filters.id || filters.category_id || filters.status || filters.state || filters.minPrice || filters.maxPrice) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Wissen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Listings table */}
      <div className="bg-white rounded-2xl shadow-smooth border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Titel</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Prijs</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Categorie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Conditie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Locatie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.length === 0 && listings.length > 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Geen advertenties gevonden met de huidige filters.
                  </td>
                </tr>
              )}
              {filteredListings.length === 0 && listings.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Geen advertenties gevonden. Controleer of je bent ingelogd als admin.
                  </td>
                </tr>
              )}
              {filteredListings.map(listing => (
                <tr key={listing.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{listing.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{listing.title}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(listing.price)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getCategoryName(listing.category_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getConditionLabel(listing.state)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{listing.location || '-'}</td>
                  <td className="px-4 py-3">
                    {listing.status === "actief" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Actief
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inactief
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full bg-primary text-black px-4 py-1.5 text-sm font-semibold hover:bg-primary/80 transition-colors"
                        onClick={() => startEditing(listing)}
                      >
                        Bewerken
                      </button>
                      <button
                        className="rounded-full bg-yellow-500 text-white px-4 py-1.5 text-sm font-semibold hover:bg-yellow-600 transition-colors"
                        onClick={() => toggleStatus(listing.id, listing.status)}
                      >
                        {listing.status === "actief" ? "Deactiveren" : "Activeren"}
                      </button>
                      <button
                        className="rounded-full bg-red-500 text-white px-4 py-1.5 text-sm font-semibold hover:bg-red-600 transition-colors"
                        onClick={() => deleteListing(listing.id)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
