"use client";

import { useEffect, useState } from "react";

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
        setListings(data);
      } else {
        const errorText = await res.text();
        console.error("Failed to fetch listings:", res.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
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

  const filteredListings = listings.filter(listing => {
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

  if (loading) return <div>Laden...</div>;

  if (editingListing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Zoekertje Bewerken</h2>
          <button
            onClick={cancelEditing}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Annuleren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium mb-2">Titel *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Beschrijving *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Prijs (€) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categorie *</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium mb-2">Subcategorie</label>
            <select
              name="subcategory_id"
              value={formData.subcategory_id}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium mb-2">Conditie *</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="new">Nieuw</option>
              <option value="like_new">Zo goed als nieuw</option>
              <option value="good">Goed</option>
              <option value="fair">Redelijk</option>
              <option value="poor">Matig</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="actief">Actief</option>
              <option value="inactief">Inactief</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Locatie</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nieuwe Afbeeldingen</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Selecteer nieuwe afbeeldingen om toe te voegen (optioneel)
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Bezig met bijwerken..." : "Zoekertje Bijwerken"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Advertenties</h2>
          <span className="text-sm text-gray-500">
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
              className="w-full sm:w-64 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Quick filters */}
          <select
            value={filters.category_id}
            onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle statussen</option>
            <option value="actief">Actief</option>
            <option value="inactief">Inactief</option>
          </select>
          
          {(filters.title || filters.id || filters.category_id || filters.status || filters.state || filters.minPrice || filters.maxPrice) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Wissen
            </button>
          )}
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Titel</th>
            <th className="border p-2">Prijs</th>
            <th className="border p-2">Categorie</th>
            <th className="border p-2">Conditie</th>
            <th className="border p-2">Locatie</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Acties</th>
          </tr>
        </thead>
        <tbody>
          {filteredListings.length === 0 && listings.length > 0 && (
            <tr>
              <td colSpan={8} className="border p-4 text-center text-gray-500">
                Geen advertenties gevonden met de huidige filters.
              </td>
            </tr>
          )}
          {filteredListings.length === 0 && listings.length === 0 && !loading && (
            <tr>
              <td colSpan={8} className="border p-4 text-center text-gray-500">
                Geen advertenties gevonden. Controleer of je bent ingelogd als admin.
              </td>
            </tr>
          )}
          {filteredListings.map(listing => (
            <tr key={listing.id}>
              <td className="border p-2">{listing.id}</td>
              <td className="border p-2">{listing.title}</td>
              <td className="border p-2">€{listing.price}</td>
              <td className="border p-2">{getCategoryName(listing.category_id)}</td>
              <td className="border p-2">{getConditionLabel(listing.state)}</td>
              <td className="border p-2">{listing.location || '-'}</td>
              <td className="border p-2">{listing.status}</td>
              <td className="border p-2">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                  onClick={() => startEditing(listing)}
                >
                  Bewerken
                </button>
                <button
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                  onClick={() => toggleStatus(listing.id, listing.status)}
                >
                  {listing.status === "actief" ? "Deactiveren" : "Activeren"}
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() => deleteListing(listing.id)}
                >
                  Verwijderen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
