"use client";

import { useEffect, useState } from "react";

type Subcategory = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  category_id: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  subs: Subcategory[];
};

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", sort_order: 0, is_active: true });
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
    setLoading(false);
  };

  const addCategory = async () => {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCategory),
    });
    if (res.ok) {
      fetchCategories();
      setNewCategory({ name: "", slug: "", sort_order: 0, is_active: true });
    }
  };

  const updateCategory = async (id: number, updates: Partial<Category>) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      fetchCategories();
    }
  };

  const addSubcategory = async (categoryId: number, sub: Omit<Subcategory, 'id' | 'category_id'>) => {
    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sub, category_id: categoryId }),
    });
    if (res.ok) {
      fetchCategories();
    }
  };

  const updateSubcategory = async (id: number, updates: Partial<Subcategory>) => {
    const res = await fetch(`/api/admin/subcategories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      fetchCategories();
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Weet je het zeker?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const deleteSubcategory = async (id: number) => {
    if (!confirm("Weet je het zeker?")) return;
    const res = await fetch(`/api/admin/subcategories/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchCategories();
    }
  };

  if (loading) return <div>Laden...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Categorien</h2>

      {/* Add new category */}
      <div className="mb-4 p-4 border rounded">
        <h3 className="font-semibold mb-2">Nieuwe Categorie Toevoegen</h3>
        <input
          type="text"
          placeholder="Naam"
          value={newCategory.name}
          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Slug"
          value={newCategory.slug}
          onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="number"
          placeholder="Sorteervolgorde"
          value={newCategory.sort_order}
          onChange={(e) => setNewCategory({ ...newCategory, sort_order: parseInt(e.target.value) })}
          className="border p-2 mr-2"
        />
        <button onClick={addCategory} className="bg-blue-500 text-white px-4 py-2 rounded">
          Toevoegen
        </button>
      </div>

      {/* Categories table */}
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Naam</th>
            <th className="border p-2">Slug</th>
            <th className="border p-2">Sorteervolgorde</th>
            <th className="border p-2">Actief</th>
            <th className="border p-2">Subs</th>
            <th className="border p-2">Acties</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(category => (
            <>
              <tr key={category.id}>
                <td className="border p-2">{category.id}</td>
                <td className="border p-2">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    value={category.slug}
                    onChange={(e) => updateCategory(category.id, { slug: e.target.value })}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={category.sort_order}
                    onChange={(e) => updateCategory(category.id, { sort_order: parseInt(e.target.value) })}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="checkbox"
                    checked={category.is_active}
                    onChange={(e) => updateCategory(category.id, { is_active: e.target.checked })}
                  />
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => setExpanded(expanded === category.id ? null : category.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    {expanded === category.id ? "Inklappen" : "Uitklappen"} ({category.subs?.length || 0})
                  </button>
                </td>
                <td className="border p-2">
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => deleteCategory(category.id)}
                  >
                    Verwijderen
                  </button>
                </td>
              </tr>
              {expanded === category.id && (
                <tr>
                  <td colSpan={7} className="border p-4 bg-gray-50">
                    <SubcategoryManagement
                      categoryId={category.id}
                      subs={category.subs || []}
                      onAdd={addSubcategory}
                      onUpdate={updateSubcategory}
                      onDelete={deleteSubcategory}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubcategoryManagement({ categoryId, subs, onAdd, onUpdate, onDelete }: {
  categoryId: number;
  subs: Subcategory[];
  onAdd: (categoryId: number, sub: Omit<Subcategory, 'id' | 'category_id'>) => void;
  onUpdate: (id: number, updates: Partial<Subcategory>) => void;
  onDelete: (id: number) => void;
}) {
  const [newSub, setNewSub] = useState({ name: "", slug: "", sort_order: 0, is_active: true });

  const handleAdd = () => {
    onAdd(categoryId, newSub);
    setNewSub({ name: "", slug: "", sort_order: 0, is_active: true });
  };

  return (
    <div>
      <h4 className="font-semibold mb-2">Subcategorieën</h4>
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          placeholder="Naam"
          value={newSub.name}
          onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
          className="border p-1"
        />
        <input
          type="text"
          placeholder="Slug"
          value={newSub.slug}
          onChange={(e) => setNewSub({ ...newSub, slug: e.target.value })}
          className="border p-1"
        />
        <input
          type="number"
          placeholder="Sorteervolgorde"
          value={newSub.sort_order}
          onChange={(e) => setNewSub({ ...newSub, sort_order: parseInt(e.target.value) })}
          className="border p-1"
        />
        <button onClick={handleAdd} className="bg-green-500 text-white px-2 py-1 rounded">
          Sub Toevoegen
        </button>
      </div>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-1">ID</th>
            <th className="border p-1">Naam</th>
            <th className="border p-1">Slug</th>
            <th className="border p-1">Sortering</th>
            <th className="border p-1">Actief</th>
            <th className="border p-1">Acties</th>
          </tr>
        </thead>
        <tbody>
          {subs.map(sub => (
            <tr key={sub.id}>
              <td className="border p-1">{sub.id}</td>
              <td className="border p-1">
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => onUpdate(sub.id, { name: e.target.value })}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border p-1">
                <input
                  type="text"
                  value={sub.slug}
                  onChange={(e) => onUpdate(sub.id, { slug: e.target.value })}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border p-1">
                <input
                  type="number"
                  value={sub.sort_order}
                  onChange={(e) => onUpdate(sub.id, { sort_order: parseInt(e.target.value) })}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border p-1">
                <input
                  type="checkbox"
                  checked={sub.is_active}
                  onChange={(e) => onUpdate(sub.id, { is_active: e.target.checked })}
                />
              </td>
              <td className="border p-1">
                <button
                  className="bg-red-500 text-white px-1 py-1 rounded text-sm"
                  onClick={() => onDelete(sub.id)}
                >
                  Verw
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
