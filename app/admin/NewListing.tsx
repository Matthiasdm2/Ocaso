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
  condition: string;
  location?: string;
  status: string;
  images?: { id: string; image_url: string; is_primary: boolean }[];
};

export default function EditListing() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category_id: "",
    subcategory_id: "",
    condition: "new",
    location: "",
    status: "active",
    images: [] as File[],
  });

  // Haal categorieën en listings op bij mount
  useEffect(() => {
    fetchCategories();
    fetchListings();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchListings = async () => {
    try {
      const response = await fetch("/api/admin/listings");
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      images: files
    }));
  };

  const startEditing = (listing: Listing) => {
    setSelectedListing(listing);
    setFormData({
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      category_id: listing.category_id,
      subcategory_id: listing.subcategory_id || "",
      condition: listing.condition,
      location: listing.location || "",
      status: listing.status,
      images: [],
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setSelectedListing(null);
    setEditing(false);
    setFormData({
      title: "",
      description: "",
      price: "",
      category_id: "",
      subcategory_id: "",
      condition: "new",
      location: "",
      status: "active",
      images: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;

    setLoading(true);

    try {
      const submitData = new FormData();

      // Voeg alle form data toe
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'images') {
          (value as File[]).forEach((file) => {
            submitData.append(`images`, file);
          });
        } else {
          submitData.append(key, value as string);
        }
      });

      const response = await fetch(`/api/admin/listings/${selectedListing.id}`, {
        method: "PUT",
        body: submitData,
      });

      if (response.ok) {
        alert("Zoekertje succesvol bijgewerkt!");
        await fetchListings(); // Refresh de lijst
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

  if (loading && !editing) return <div>Laden...</div>;

  if (editing && selectedListing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Zoekertje Bewerken</h2>
          <button
            onClick={cancelEditing}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Annuleren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titel */}
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

          {/* Beschrijving */}
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

          {/* Prijs */}
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

          {/* Categorie */}
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

          {/* Subcategorie */}
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

          {/* Conditie */}
          <div>
            <label className="block text-sm font-medium mb-2">Conditie *</label>
            <select
              name="condition"
              value={formData.condition}
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

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Actief</option>
              <option value="paused">Gepauzeerd</option>
              <option value="sold">Verkocht</option>
            </select>
          </div>

          {/* Locatie */}
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

          {/* Afbeeldingen */}
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

          {/* Submit button */}
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
      <h2 className="text-xl font-semibold mb-6">Zoekertjes Bewerken</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prijs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">€{listing.price}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      listing.status === 'active' ? 'bg-green-100 text-green-800' :
                      listing.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {listing.status === 'active' ? 'Actief' :
                       listing.status === 'paused' ? 'Gepauzeerd' : 'Verkocht'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => startEditing(listing)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Bewerken
                    </button>
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
