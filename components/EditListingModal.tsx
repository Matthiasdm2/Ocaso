"use client";

import { useEffect, useState } from "react";

import CategorySelect from "@/components/CategorySelect";
import ImagePreviewSlider from "@/components/ImagePreviewSlider";
import PhotoUploader from "@/components/PhotoUploader";
import { useToast } from "@/components/Toast";

import { createClient } from "../lib/supabaseClient";

type Listing = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  condition?: string | null;
  category?: string | null;
  subcategory?: string | null;
  location?: string | null;
  allow_offers?: boolean | null;
  min_bid?: number | null;
  shipping_via_ocaso?: boolean | null;
  dimensions_length?: number | null;
  dimensions_width?: number | null;
  dimensions_height?: number | null;
  images?: string[] | null;
  main_photo?: string | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  stock?: number | null;
  // Add other fields as needed
};

type Props = {
  listing: Listing | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedListing: Partial<Listing>) => void;
};

const CONDITIONS = [
  { value: "nieuw", label: "Nieuw" },
  { value: "bijna nieuw", label: "Bijna nieuw" },
  { value: "in goede staat", label: "In goede staat" },
  { value: "gebruikt", label: "Gebruikt" },
  { value: "defect", label: "Defect" },
];

// Helper function (from sell page)
function randomId() {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Helper function to find category/subcategory IDs by name
async function findCategoryIdsByName(supabase: ReturnType<typeof createClient>, categoryName: string, subcategoryName?: string): Promise<{ categoryId: string; subcategoryId: string }> {
  let categoryId = "";
  let subcategoryId = "";

  // Find category by name
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("name", categoryName);

  if (categories && categories.length > 0) {
    categoryId = String(categories[0].id);

    // Find subcategory by name if provided
    if (subcategoryName) {
      const { data: subcategories } = await supabase
        .from("subcategories")
        .select("id, name")
        .eq("category_id", categories[0].id)
        .eq("name", subcategoryName);

      if (subcategories && subcategories.length > 0) {
        subcategoryId = String(subcategories[0].id);
      }
    }
  }

  return { categoryId, subcategoryId };
}

export default function EditListingModal({ listing, open, onClose, onSave }: Props) {
  const supabase = createClient();
  const { push } = useToast();

  const [formData, setFormData] = useState<Partial<Listing>>({});
  const [saving, setSaving] = useState(false);

  // Category selection state (IDs for CategorySelect component)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");

  // Image management state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Image management constants
  const MAX_PHOTOS = 12;
  const BUCKET_NAME = "listing-images";
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_MB = 10;

  useEffect(() => {
    if (listing && open) {
      setFormData({
        title: listing.title || "",
        description: listing.description || "",
        price: listing.price || undefined,
        condition: listing.condition || "nieuw",
        category: listing.category || "",
        subcategory: listing.subcategory || "",
        location: listing.location || "",
        allow_offers: listing.allow_offers ?? true,
        min_bid: listing.min_bid || undefined,
        shipping_via_ocaso: listing.shipping_via_ocaso ?? false,
        dimensions_length: listing.dimensions_length || undefined,
        dimensions_width: listing.dimensions_width || undefined,
        dimensions_height: listing.dimensions_height || undefined,
        stock: listing.stock || 1,
      });

      // Initialize images
      const images = listing.images || [];
      setImageUrls(images);
      const mainPhoto = listing.main_photo;
      if (mainPhoto && images.includes(mainPhoto)) {
        setMainIndex(images.indexOf(mainPhoto));
      } else if (images.length > 0) {
        setMainIndex(0);
      }

      // Load category IDs from names
      if (listing.category) {
        findCategoryIdsByName(supabase, listing.category, listing.subcategory || undefined).then(({ categoryId, subcategoryId }) => {
          setSelectedCategoryId(categoryId);
          setSelectedSubcategoryId(subcategoryId);
        }).catch(console.error);
      }
    }
  }, [listing, open, supabase]);

  // Image management functions
  async function uploadOne(file: File, userId: string): Promise<string> {
    const original = file.name || "image.jpg";
    const ext = (original.includes(".") ? original.split(".").pop() : "") || "jpg";
    const path = `${userId}/${randomId()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  }

  function validateFiles(fs: File[]) {
    for (const f of fs) {
      if (!ACCEPTED_TYPES.includes(f.type)) throw new Error(`Bestandstype niet toegestaan: ${f.type || f.name}`);
      const sizeMb = f.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) throw new Error(`Bestand > ${MAX_FILE_MB}MB: ${f.name}`);
    }
  }

  async function handleFilesSelected(fs: File[]) {
    try {
      setUploading(true);
      if (!fs.length) return;
      validateFiles(fs);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { push("Log eerst in voor je foto's uploadt."); return; }

      const remaining = Math.max(0, MAX_PHOTOS - imageUrls.length);
      if (remaining <= 0) { push(`Maximaal ${MAX_PHOTOS} foto's bereikt.`); return; }

      const slice = fs.slice(0, remaining);
      if (slice.length < fs.length) push(`Je kunt er nog ${remaining} toevoegen (max. ${MAX_PHOTOS}).`);

      const newUrls: string[] = [];
      for (const f of slice) newUrls.push(await uploadOne(f, user.id));

      setImageUrls((prev) => {
        const next = [...prev, ...newUrls];
        if (next.length && (mainIndex < 0 || mainIndex >= next.length)) setMainIndex(0);
        return next;
      });
      push(`${newUrls.length} foto's opgeladen.`);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) push(`Upload mislukt: ${e.message}`); else push("Upload mislukt: onbekende fout");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(index: number) {
    setImageUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (mainIndex >= next.length) setMainIndex(Math.max(0, next.length - 1));
      return next;
    });
  }

  function markAsMain(index: number) {
    setMainIndex(index);
  }

  // Wait for images to be accessible (lighter version)
  async function waitForImages(urls: string[]): Promise<void> {
    // Only wait for newly uploaded images (those with timestamps in the URL)
    const newImages = urls.filter(url => url.includes('randomId') || url.includes('?t='));
    
    if (newImages.length === 0) return;
    
    // Wait 2 seconds for new images to be fully available
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Drag and drop handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder images
    const newImageUrls = [...imageUrls];
    const [draggedImage] = newImageUrls.splice(draggedIndex, 1);
    newImageUrls.splice(dropIndex, 0, draggedImage);
    
    setImageUrls(newImageUrls);

    // Update mainIndex if it was affected by the reorder
    let newMainIndex = mainIndex;
    if (mainIndex === draggedIndex) {
      newMainIndex = dropIndex;
    } else if (mainIndex > draggedIndex && mainIndex <= dropIndex) {
      newMainIndex = mainIndex - 1;
    } else if (mainIndex < draggedIndex && mainIndex >= dropIndex) {
      newMainIndex = mainIndex + 1;
    }
    
    setMainIndex(newMainIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  // Category change handlers
  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(""); // Reset subcategory when category changes

    // Update formData with category name
    if (categoryId) {
      const { data: category } = await supabase
        .from("categories")
        .select("name")
        .eq("id", parseInt(categoryId))
        .single();

      setFormData(prev => ({
        ...prev,
        category: category?.name || "",
        subcategory: "" // Reset subcategory name too
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        category: "",
        subcategory: ""
      }));
    }
  };

  const handleSubcategoryChange = async (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);

    // Update formData with subcategory name
    if (subcategoryId) {
      const { data: subcategory } = await supabase
        .from("subcategories")
        .select("name")
        .eq("id", parseInt(subcategoryId))
        .single();

      setFormData(prev => ({
        ...prev,
        subcategory: subcategory?.name || ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        subcategory: ""
      }));
    }
  };

  const handleSave = async () => {
    if (!listing) return;

    setSaving(true);
    try {
      const updateData = { ...formData };
      delete updateData.category;
      delete updateData.subcategory;

      // Add category IDs
      if (selectedCategoryId) {
        updateData.category_id = parseInt(selectedCategoryId);
      }
      if (selectedSubcategoryId) {
        updateData.subcategory_id = parseInt(selectedSubcategoryId);
      }

      // Add image data
      updateData.images = imageUrls;
      updateData.main_photo = imageUrls[mainIndex] || null;

      // Wait for images to be accessible before saving
      if (imageUrls.length > 0) {
        await waitForImages(imageUrls);
      }

      await onSave(updateData);
      push("Zoekertje bijgewerkt!");
      onClose();
    } catch (error) {
      push("Bijwerken mislukt. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !listing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Zoekertje bewerken</h3>
              <p className="text-sm text-gray-600 mt-1">Alle gegevens van je zoekertje aanpassen</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 max-h-[65vh] overflow-y-auto space-y-8">
          {/* Basis Informatie */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basis Informatie
              </h4>
              <p className="text-sm text-gray-600 mt-1">De essentiële details van je zoekertje</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Bijv. iPhone 13 Pro Max"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Omschrijving *
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 resize-none"
                  placeholder="Beschrijf je product in detail..."
                />
              </div>
            </div>
          </div>

          {/* Prijs & Conditie */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Prijs & Staat
              </h4>
              <p className="text-sm text-gray-600 mt-1">Bepaal de waarde en conditie</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prijs (€) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                  <input
                    type="number"
                    value={formData.price ?? ""}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voorraad *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.stock ?? 1}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : 1 })}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-4 pr-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    placeholder="1"
                    min="0"
                  />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staat *
                </label>
                <select
                  value={formData.condition || "nieuw"}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Allow Offers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Biedingen toestaan</label>
                  <p className="text-sm text-gray-500 mt-1">Laat kopers bieden op je product</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, allow_offers: !(formData.allow_offers ?? true) })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    formData.allow_offers ?? true ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.allow_offers ?? true ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Minimum Bid - only show when offers are allowed */}
              {(formData.allow_offers ?? true) && (
                <div className="ml-6 pl-4 border-l-2 border-emerald-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum bod (€)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                    <input
                      type="number"
                      value={formData.min_bid ?? ""}
                      onChange={(e) => setFormData({ ...formData, min_bid: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Optioneel minimum bod"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Laat leeg voor geen minimum</p>
                </div>
              )}
            </div>
          </div>

          {/* Categorieën */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Categorieën
              </h4>
              <p className="text-sm text-gray-600 mt-1">Kies de juiste categorie voor je product</p>
            </div>

            <div>
              <CategorySelect
                valueCategory={selectedCategoryId}
                valueSubcategory={selectedSubcategoryId}
                onChangeCategory={handleCategoryChange}
                onChangeSubcategory={handleSubcategoryChange}
              />
            </div>
          </div>

          {/* Locatie */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Locatie
              </h4>
              <p className="text-sm text-gray-600 mt-1">Waar bevindt je product zich?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locatie
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Bijv. Gent, Antwerpen..."
                  />
                </div>
              </div>

              {/* Shipping via Ocaso */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Verzenden via Ocaso</label>
                    <p className="text-sm text-gray-500 mt-1">Aan de integratie wordt gewerkt - binnenkort beschikbaar</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shipping_via_ocaso: !(formData.shipping_via_ocaso ?? false) })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      formData.shipping_via_ocaso ?? false ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.shipping_via_ocaso ?? false ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Dimensions - only show when shipping via Ocaso is enabled */}
                {(formData.shipping_via_ocaso ?? false) && (
                  <div className="ml-6 pl-4 border-l-2 border-emerald-200 space-y-4">
                    <h5 className="text-sm font-medium text-gray-700">Afmetingen (cm)</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Lengte
                        </label>
                        <input
                          type="number"
                          value={formData.dimensions_length ?? ""}
                          onChange={(e) => setFormData({ ...formData, dimensions_length: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Breedte
                        </label>
                        <input
                          type="number"
                          value={formData.dimensions_width ?? ""}
                          onChange={(e) => setFormData({ ...formData, dimensions_width: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Hoogte
                        </label>
                        <input
                          type="number"
                          value={formData.dimensions_height ?? ""}
                          onChange={(e) => setFormData({ ...formData, dimensions_height: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">Vul de afmetingen in voor nauwkeurige verzendkosten</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Afbeeldingen */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Foto&apos;s
              </h4>
              <p className="text-sm text-gray-600 mt-1">Voeg duidelijke foto&apos;s toe om je product beter te presenteren</p>
            </div>

            <div className="space-y-4">
              {imageUrls.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Huidige foto&apos;s ({imageUrls.length})</h5>
                  </div>
                  <ImagePreviewSlider
                    imageUrls={imageUrls}
                    mainIndex={mainIndex}
                    markAsMain={markAsMain}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    draggedIndex={draggedIndex}
                    dragOverIndex={dragOverIndex}
                    onRemove={handleRemoveImage}
                  />
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 border-dashed">
                <PhotoUploader
                  onFilesChange={handleFilesSelected}
                  uploading={uploading}
                  maxCount={MAX_PHOTOS}
                  currentCount={imageUrls.length}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-12 py-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4 items-center min-h-[80px]">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition font-medium shadow-sm"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Opslaan...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Opslaan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
