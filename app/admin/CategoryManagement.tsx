"use client";

import React, { useEffect, useState } from "react";

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

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">Laden...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Categorien</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {categories.length} categorieën
        </span>
      </div>

      {/* Add new category */}
      <div className="bg-white rounded-2xl shadow-smooth p-6 border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Nieuwe Categorie Toevoegen</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Naam"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <input
            type="text"
            placeholder="Slug"
            value={newCategory.slug}
            onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <input
            type="number"
            placeholder="Sorteervolgorde"
            value={newCategory.sort_order}
            onChange={(e) => setNewCategory({ ...newCategory, sort_order: parseInt(e.target.value) || 0 })}
            className="w-32 px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <button 
            onClick={addCategory} 
            className="rounded-full bg-primary text-black px-6 py-2.5 text-sm font-semibold hover:bg-primary/80 transition-colors whitespace-nowrap"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {/* Categories table */}
      <div className="bg-white rounded-2xl shadow-smooth border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Naam</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sorteervolgorde</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actief</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Subs</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Acties</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <React.Fragment key={category.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{category.id}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={category.slug}
                        onChange={(e) => updateCategory(category.id, { slug: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={category.sort_order}
                        onChange={(e) => updateCategory(category.id, { sort_order: parseInt(e.target.value) || 0 })}
                        className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={category.is_active}
                        onChange={(e) => updateCategory(category.id, { is_active: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === category.id ? null : category.id)}
                        className="rounded-full bg-primary text-black px-4 py-1.5 text-sm font-semibold hover:bg-primary/80 transition-colors"
                      >
                        {expanded === category.id ? "Inklappen" : "Uitklappen"} ({category.subs?.length || 0})
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-full bg-red-500 text-white px-4 py-1.5 text-sm font-semibold hover:bg-red-600 transition-colors"
                        onClick={() => deleteCategory(category.id)}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                  {expanded === category.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50">
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
    <div className="space-y-4">
      <h4 className="font-bold text-gray-900 mb-3">Subcategorieën</h4>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Naam"
          value={newSub.name}
          onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <input
          type="text"
          placeholder="Slug"
          value={newSub.slug}
          onChange={(e) => setNewSub({ ...newSub, slug: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <input
          type="number"
          placeholder="Sorteervolgorde"
          value={newSub.sort_order}
          onChange={(e) => setNewSub({ ...newSub, sort_order: parseInt(e.target.value) || 0 })}
          className="w-32 px-3 py-2 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <button 
          onClick={handleAdd} 
          className="rounded-full bg-emerald-500 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-600 transition-colors whitespace-nowrap"
        >
          Sub Toevoegen
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Naam</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Slug</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Sortering</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Actief</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Acties</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(sub => (
                <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-xs text-gray-600 font-mono">{sub.id}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sub.name}
                      onChange={(e) => onUpdate(sub.id, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sub.slug}
                      onChange={(e) => onUpdate(sub.id, { slug: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={sub.sort_order}
                      onChange={(e) => onUpdate(sub.id, { sort_order: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={sub.is_active}
                      onChange={(e) => onUpdate(sub.id, { is_active: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      className="rounded-full bg-red-500 text-white px-3 py-1 text-xs font-semibold hover:bg-red-600 transition-colors"
                      onClick={() => onDelete(sub.id)}
                    >
                      Verwijderen
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
